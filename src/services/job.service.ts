import { ChannelStats } from "./channel.service";
import TelegramService from "./telegram.service";
import ChannelService from "./channel.service";
import MessageService, { MessagesWithoutHashes } from "./message.service";
import HashService from "./hash.service";
import ErrorService from "./processing-status.service";
import { Channel1 } from "../entity/Channel1";
import { delay } from "../utility/delay.utility";
import DuplicateService from "./duplicate.service";
import DiscordService, { MessageBuilder } from "./discord.service";
import { AppDataSource } from "../data-source";
import { JobLog1 } from "../entity/JobLog1";
import { Cron1 } from "../entity/Cron1";
import { CronJob } from "cron";

const DELAY_OFFSET = 5; // do 5 at a time
const DELAY_TIME = 10000;

export interface Job { func: Function; cron: string; }
const runCronJobs = (jobs: Job[]): CronJob[] => {
  const runningJobs = [];
  for (const { func, cron } of jobs) {
    runningJobs.push(CronJob.from({
      cronTime: cron,
      onTick: () => func(),
      start: true,
      timeZone: "UTC",
    }));
  }
  return runningJobs;
};

const scrapeAndHashMessages = async (fromCron: boolean = true): Promise<number> => {
  const ID = "scrapeAndHashMessages";
  // is this job active?
  if (fromCron) {
    const cron = await AppDataSource.manager.findOneBy(Cron1, { job: ID });
    if (!cron.on) return null;
  }

  const entryLog = await startJobLog(ID);
  const startTime = new Date();
  let message = new MessageBuilder();
  message.add("\n:watch:");
  message.addCode(startTime.toUTCString());
  message.add(" - starting scrapeAndHash");
  await DiscordService.sendDiscordNotification(message.toString());
  const channels: Channel1[] = await ChannelService.getChannelIds();
  const channelStats = await ChannelService.getChannelStats();

  let delayCount = 0;
  let totalMessages = 0;
  let error = null;
  try {
    for (const channel of channels) {
      const afterId = channelStats.find(c => c.name === channel.name)?.last_tg_id;
      const messages = await TelegramService.getVideoMessages({ channel: channel.name, afterId });
      console.log(channel.name, "(id: " + channel.id + ")");
      if (messages.length > 0) {
        let saved = 0;
        for (const message of messages) {
          await delay(DELAY_TIME / 2, true);
          const tgHash = await TelegramService.downloadTgHash(message);
          const hashes = HashService.joinTgHashes(tgHash);
          const result = await MessageService.saveMessageAndHash(channel.id, message, hashes);
          const duplicates = await DuplicateService.getDuplicates(result.document, { hash: true, duration: true, fileName: true });
          DiscordService.createNewMessageLoggedAlert(channel.name, message.id, { duplicates });
          totalMessages++;
          saved++;
        }
        console.log(`\tsaved ${saved} messages to db`);
      }

      // should we delay to be nice to Telegram? (and hopefully not get FLOOD exceptioned)
      if (delayCount % DELAY_OFFSET === 0) {
        await delay(DELAY_TIME, true);
      }
      delayCount++;
    }
  } catch (e) {
    console.error(e);
    error = e;
  } finally {
    const endTime = new Date();
    if (error) {
      await closeJobLog(entryLog, totalMessages, true, error);
      message.clear();
      message.add(":man_facepalming: ");
      message.addCode(endTime.toUTCString());
      message.add(" errors scrapeAndHash (did " + totalMessages + " videos)");
      await DiscordService.sendDiscordNotification(message.toString());
    } else {
      await closeJobLog(entryLog, totalMessages, true);
      message.clear();
      message.add(":white_check_mark: ");
      message.addCode(endTime.toUTCString());
      message.add(" end scrapeAndHash WITH ERRORS (did " + totalMessages + " videos)");
      await DiscordService.sendDiscordNotification(message.toString());
    }
  }
  return totalMessages;
};

export interface ScrapeAndSaveOptions { all?: boolean; onlyNew?: boolean; }
const scrapeVideoMessages = async ({ all, onlyNew }: ScrapeAndSaveOptions): Promise<void> => {
  const ID = "scrapeVideoMessages";
  const entryLog = await startJobLog(ID);
  const channels: Channel1[] = await ChannelService.getChannelIds();

  let channelStats: ChannelStats[] | null;
  if (all) {
    channelStats = null;
  } else if (onlyNew) {
    channelStats = await ChannelService.getChannelStats();
  }

  // get any missing messages
  let delayCount = 0;
  let totalMessages = 0;
  for (const channel of channels) {
    let afterId;
    if (all) {
      afterId = 0;
    } else if (onlyNew) {
      afterId = channelStats.find(c => c.name === channel.name)?.last_tg_id;
    }

    // get the messages
    console.log(`${channel.name} - getting video messages, after id ${afterId}`);
    const messages = await TelegramService.getVideoMessages({ channel: channel.name, afterId });
    console.log(`${channel.name} - got ${messages.length} video messages`);

    if (messages.length > 0) {
      // save the messages
      console.log(`${channel.name} - saving ${messages.length} messages to db`);
      let saved = 0;
      while (messages.length > 0) {
        const messages_ = messages.splice(0, 50);
        await MessageService.saveMessages(channel.id, messages_);
        saved += messages_.length;
        totalMessages += messages_.length
      }
      console.log(`${channel.name} - saved ${saved} messages to db`);
    }

    // should we delay to be nice to Telegram? (and hopefully not get FLOOD exceptioned)
    if (delayCount % DELAY_OFFSET === 0) {
      console.log("...taking a rest...");
      await delay(DELAY_TIME);
    }
    delayCount++;
  }
  await closeJobLog(entryLog, totalMessages, true);
};

const populateMissingHashesTgSHA = async() => {
  const ID = "scrapeAndHashMessages";
  const entryLog = await startJobLog(ID);

  const missings: MessagesWithoutHashes[] = await MessageService.getMessagesWithoutHashes();
  console.log("Need to get", missings.length, "hashes");
  // Get all channelIds
  const channelIds = Array.from(new Set(missings.map(m => m.channel_id)));
  const channelMap: Record<number, MessagesWithoutHashes[]> = {};
  for (const channelId of channelIds) {
    channelMap[channelId] = missings.filter(m => m.channel_id === channelId);
  }

  // One channel at a time
  let totalMessages = 0;
  for (const [key, value] of Object.entries(channelMap)) {
    let counts = [0, 0, 0]; // new, dupe, error
    const channelId = key;
    const channelName = value[0].channel_name;

    console.log("Downloading: " + value.length, "| id:", channelId, channelName);
    try {
      // Files in Telegram are hashed according to 131072 byte chunks
      //  - write to db:
      //    1. order these chunks according to their offset
      //    2. convert the hash buffer to JSON
      //    3. join with a ;
      const tgIds = value.map(v => v.message_tg_id);

      // Get 50 messages at a time
      while (tgIds.length > 0) {
        const subListOfTgIds = tgIds.splice(0, 50);
        const messages = await TelegramService.getVideoMessagesByIds(channelName, subListOfTgIds);

        // Get the hash for each message individually
        let delayCount = 0;
        for (const message of messages) {
          try {
            const tgHash = await TelegramService.downloadTgHash(message);
            tgHash.sort((a, b) => a.offset.valueOf() - b.offset.valueOf());
            const hashes = tgHash.map(hash => hash.hash.toJSON().data);
            const joined = hashes.join(";");
            const missing = channelMap[channelId].find(ch => ch.message_tg_id === message.id);
            const isNewHash = await HashService.saveHash(missing.document_id, joined.trim());
            if (isNewHash) {
              counts[0]++;
            } else {
              counts[1]++;
            }
          } catch (e) {
            console.log(e);
            const missing = channelMap[channelId].find(ch => ch.message_tg_id === message.id);
            await ErrorService.saveProcessingError(missing.document_id, "unknown", e);
            counts[2]++;
          }
          // should we delay to be nice to Telegram? (and hopefully not get FLOOD exceptioned)
          if (delayCount % DELAY_OFFSET === 0) {
            console.log("...taking a rest...");
            await delay(DELAY_TIME);
          }
          delayCount++;
          totalMessages++;
        }
        console.log(`\tgot > ${counts[0]} new, ${counts[1]} dupes, ${counts[2]} errors = ${counts[0] + counts[1] + counts[2]}`);
      }
    } catch (e) {
      console.log("ERROR!", e);
    }
  }
  await closeJobLog(entryLog, totalMessages, true);
};

const startJobLog = async (job: string) => {
  const logEntry = new JobLog1();
  logEntry.job = job
  return AppDataSource.manager.save(logEntry);
};

const closeJobLog = async (logEntry: JobLog1, numAdded: number, andHashes: boolean = false, error: unknown = null) => {
  const now = new Date();
  logEntry.number_messages = numAdded;
  logEntry.and_hashes = andHashes;
  logEntry.finished_at = logEntry.created_at > now ? logEntry.created_at : now;
  logEntry.updated_at = logEntry.created_at > now ? logEntry.created_at : now;
  if (error) {
    logEntry.error = error;
  }
  return AppDataSource.manager.save(logEntry);
};

export default {
  runCronJobs,
  scrapeAndHashMessages,
  scrapeVideoMessages,
  populateMissingHashesTgSHA,
  startJobLog,
  closeJobLog,
};