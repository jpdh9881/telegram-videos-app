import _telegramService from "./telegram.service";
import _channelService from "./channel.service";
import _messageService, { MessagesWithoutHashes } from "./message.service";
import _hashService from "./hash.service";
import _duplicateService from "./duplicate.service";
import _discordService, { MessageBuilder, PostType } from "./discord.service";
import _loggerService from "./logger.service";
import { Channel1 } from "../entity/Channel1";
import { delay } from "../utility/delay.utility";
import { AppDataSource } from "../data-source";
import { Cron1 } from "../entity/Cron1";
import { CronJob } from "cron";
import { TotalList } from "telegram/Helpers";
import { Api } from "telegram";

const runCronJobs = (jobs: Job[]): CronJob[] => {
  const runningJobs = [];
  for (const job of jobs) {
    runningJobs.push(CronJob.from({
      cronTime: job.cron,
      onTick: () => job.start(),
      start: true,
      timeZone: "America/Toronto",
    }));
  }
  return runningJobs;
};

export interface Job { cron: string; start(): any; } // also static id, num, create()

export class BotStatusJob implements Job {
  public static num = 0;
  public static readonly id = "botStatus";
  public cron: string | undefined;

  public static create(cron?: string) {
    if (BotStatusJob.num === 0) {
      BotStatusJob.num++;
      return new BotStatusJob(cron);
    }
    throw "Already created that job!";
  }

  private constructor(cron?: string) {
    if (cron) {
      this.cron = cron;
    }
  }

  public async start(): Promise<void> {
    let message = new MessageBuilder();
    message.add("(bot is running)");
    await _discordService.sendDiscordNotification(PostType.DEBUG, message.toString());
  }
}

interface ScrapeAndHashMessagesJobCreateOptions { groups: number[], discordUpdates?: boolean }
export class ScrapeAndHashMessagesJob {
  public static id = "ScrapeAndHashMessagesJob";
  public signature: string;
  public cron: string | undefined;
  private DELAY_INTERVAL = 35000;

  // special
  private static createdJobs = [];
  private groups: number[];
  private discordUpdates = false;

  public static create(cron: string | null, options: ScrapeAndHashMessagesJobCreateOptions) {
    const { groups, discordUpdates } = options;
    const thisJobSignature = ScrapeAndHashMessagesJob.id + groups.toString();
    if (!ScrapeAndHashMessagesJob.createdJobs.includes(thisJobSignature)) {
      ScrapeAndHashMessagesJob.createdJobs.push(thisJobSignature);
      const job = new ScrapeAndHashMessagesJob(cron, groups, discordUpdates);
      job.signature = thisJobSignature;
      return job;
    }
    throw "Already created that job with that signature!";
  }

  private constructor(cron: string, groups: number[], discordUpdates: boolean) {
    this.cron = cron;
    this.groups = groups;
    this.discordUpdates = discordUpdates ?? false;
  }

  public async start(): Promise<number> {
    // is this job active?
    if (this.cron) {
      const cron = await AppDataSource.manager.findOneBy(Cron1, { job: ScrapeAndHashMessagesJob.id });
      if (!cron.on) return null;
    }

    const startTime = new Date();
    let message = new MessageBuilder();
    message.add("\n:watch:");
    message.addCode(startTime.toUTCString());
    message.add(" - starting " + this.signature);
    await _discordService.sendDiscordNotification(PostType.DEBUG, message.toString());
    let channels: Channel1[] = await _channelService.getChannelIds({ groups: this.groups });

    // TODO: filter this query by group
    const channelStats = await _channelService.getChannelStats();

    let totalMessages = 0;
    let error = null;
    try {
      for (const channel of channels) {
        const afterId = channelStats.find(c => c.name === channel.name)?.last_tg_id;

        // Only get 25 messages at a time so that the file references don't expire by the time we're ready to hash the later videos
        const batchSize = 25;
        const messageBatcher = _telegramService.getVideoMessagesBatcher({ channel: channel.name, afterId, limit: batchSize });
        while (true) {
          await delay(this.DELAY_INTERVAL, true);
          const next = await messageBatcher.next();
          if (next.done) {
            break; // no more messages, go to next channel
          }
          const messages = next.value as TotalList<Api.Message>;
          const logMsg = `${channel.name}  (id: ${channel.id}) - ` + messages.map(m => m.id).toString();
          _loggerService.debug(this.signature + " - " + logMsg);
          await _discordService.sendDiscordNotification(PostType.DEBUG, logMsg);
          if (messages.length > 0) {
            let saved = 0;
            for (const message of messages) {
              let hashes;
              try {
                // TODO: document can not have a hash (MessageMediaUnsupported) -- don't know why
                await delay(this.DELAY_INTERVAL, true);
                const tgHash = await _telegramService.downloadTgHash(message);
                _loggerService.debug(this.signature + " - " + "got the hash");
                hashes = _hashService.joinTgHashes(tgHash);
              } catch (e) {
                _loggerService.debug(this.signature + " - " + "didn't get hash\n" + e);
                await _discordService.sendDiscordNotification(PostType.DEBUG, this.signature + " - " + "(null hash issue)");
                hashes = null;
              }
              const result = await _messageService.saveMessageAndHash(channel.id, message, hashes);
              const duplicates = await _duplicateService.getDuplicates(result.document, { hash: true, duration: true, fileName: true });
              _loggerService.debug(this.signature + " - " + result.message.tg_id + "/ date: " + result.message.tg_date);
              if (this.discordUpdates) {
                if (duplicates.byHash.length === 1) {
                  // only post an update if this is a new video
                  _discordService.createNewMessageLoggedAlert(PostType.UPDATE, channel.name, message.id, { duplicates });
                } else {
                  _discordService.createNewMessageLoggedAlert(PostType.DEBUG, channel.name, message.id, { duplicates });
                }
              }
              totalMessages++;
              saved++;
            }
            _loggerService.debug(this.signature + " - " + `\tsaved ${saved} messages to db`);
          }
        }
      }
    } catch (e) {
      _loggerService.error(e);
      error = e;
    } finally {
      const endTime = new Date();
      if (error) {
        let message = new MessageBuilder();
        message.add(":man_facepalming: ");
        message.addCode(endTime.toUTCString());
        message.add(` errors ${ScrapeAndHashMessagesJob.id} WITH ERRORS (did ${totalMessages} videos)`);
        message.addLine(message.toString());
        _loggerService.error(message.toString());
        await _discordService.sendDiscordNotification(PostType.DEBUG, this.signature + " - " + message.toString());
      } else {
        let message = new MessageBuilder();
        message.add(":white_check_mark: ");
        message.addCode(endTime.toUTCString());
        message.add(` end ${ScrapeAndHashMessagesJob.id} (did ${totalMessages} videos)`);
        _loggerService.debug(message.toString());
        await _discordService.sendDiscordNotification(PostType.DEBUG, this.signature + " - " + message.toString());
      }
    }
    return totalMessages;
  }
}

export class GetMissingHashesJob {
  public readonly id = "GetMissingHashesJob";
  private DELAY_INTERVAL = 30000;
  public static num = 0;
  public cron: string | undefined;

  public static create(cron?: string) {
    if (GetMissingHashesJob.num === 0) {
      GetMissingHashesJob.num++;
      return new GetMissingHashesJob(cron);
    }
    throw "Already created that job!";
  }

  private constructor(cron?: string) {
    if (cron) {
      this.cron = cron;
    }
  }

  public async start(): Promise<number> {
    const missings: MessagesWithoutHashes[] = await _messageService.getMessagesWithoutHashes();
    const message = "Need to get " + missings.length + " hashes";
    _loggerService.debug(message);
    await _discordService.sendDiscordNotification(PostType.DEBUG, message);
    // Get all channelIds
    const channelIds = Array.from(new Set(missings.map(m => m.channel_id)));
    const channelMap: Record<number, MessagesWithoutHashes[]> = {};
    for (const channelId of channelIds) {
      channelMap[channelId] = missings.filter(m => m.channel_id === channelId);
    }

    // One channel at a time
    let totalMessages = 0;
    for (const [key, value] of Object.entries(channelMap)) {
      const channelId = key;
      const channelName = value[0].channel_name;

      _loggerService.debug("Downloading: " + value.length + " | id: " + channelId + " " + channelName);
      try {
        const tgIds = value.map(v => v.message_tg_id);
        while (tgIds.length > 0) {
          const subListOfTgIds = tgIds.splice(0, 50);
          const messages = await _telegramService.getVideoMessagesByIds(channelName, subListOfTgIds);
          await delay(this.DELAY_INTERVAL, true);

          // Get the hash for each message individually
          for (const message of messages) {
            let hashes;
            try {
              // TODO: document can not have a hash (MessageMediaUnsupported) -- don't know why
              const tgHash = await _telegramService.downloadTgHash(message);
              await delay(this.DELAY_INTERVAL, true);
              _loggerService.debug("got the hash");
              hashes = _hashService.joinTgHashes(tgHash);
            } catch (e) {
              _loggerService.debug("null hash?\n" + e);
              await _discordService.sendDiscordNotification(PostType.DEBUG, "got an UNEXPECTED null hash");
              hashes = null;
            }
            const missing = channelMap[channelId].find(ch => ch.message_tg_id === message.id);
            await _hashService.saveHash(missing.document_id, hashes.trim());
            _loggerService.debug("Hash saved.");
            totalMessages++;
          }
        }
      } catch (e) {
        _loggerService.error(e);
        await _discordService.sendDiscordNotification(PostType.DEBUG, "ERROR!\n" + e);
      }
    }
    _loggerService.error("Got " + totalMessages + " hashes");
    await _discordService.sendDiscordNotification(PostType.DEBUG, "Did " + totalMessages + " hashes");
    return totalMessages;
  }
}

export default {
  runCronJobs,
  ScrapeAndHashMessagesJob,
  GetMissingHashesJob,
};