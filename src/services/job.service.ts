import { ChannelStats } from "./channel.service";
import TelegramService from "./telegram.service";
import ChannelService from "./channel.service";
import MessageService, { MessagesWithoutHashes } from "./message.service";
import HashService from "./hash.service";
import ErrorService from "./processing-status.service";
import { Channel1 } from "../entity/Channel1";
import { delay } from "../utility/delay.utility";

const DELAY_OFFSET = 5; // do 5 at a time

export interface ScrapeAndSaveOptions { all?: boolean; onlyNew?: boolean; }
const scrapeVideoMessages = async ({ all, onlyNew }: ScrapeAndSaveOptions): Promise<void> => {
  const channels: Channel1[] = await ChannelService.getChannelIds();

  let channelStats: ChannelStats[] | null;
  if (all) {
    channelStats = null;
  } else if (onlyNew) {
    channelStats = await ChannelService.getChannelStats();
  }

  // get any missing messages
  let delayCount = 0;
  for (const channel of channels) {
    let afterId;
    if (all) {
      afterId = 0;
    } else if (onlyNew) {
      // @ts-ignore I dont' know why I need to put this here
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
        saved += messages_.length;
        await MessageService.saveMessages(channel.id, messages_);
        await MessageService.logMessageUpdates(channel.id, messages_.length, messages_.map(m => m.id));
      }
      console.log(`${channel.name} - saved ${saved} messages to db`);
    }

    // should we delay to be nice to Telegram? (and hopefully not get FLOOD exceptioned)
    if (delayCount % DELAY_OFFSET === 0) {
      console.log("...taking a rest...");
      await delay(3000);
    }
    delayCount++;
  }
};

const populateMissingHashesTgSHA = async() => {
  const missings: MessagesWithoutHashes[] = await MessageService.getMessagesWithoutHashes();
  console.log("Need to get", missings.length, "hashes");
  // Get all channelIds
  const channelIds = Array.from(new Set(missings.map(m => m.channel_id)));
  const channelMap: Record<number, MessagesWithoutHashes[]> = {};
  for (const channelId of channelIds) {
    channelMap[channelId] = missings.filter(m => m.channel_id === channelId);
  }

  // One channel at a time
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
            await delay(3000);
          }
          delayCount++;
        }
        console.log(`\tgot > ${counts[0]} new, ${counts[1]} dupes, ${counts[2]} errors = ${counts[0] + counts[1] + counts[2]}`);
      }
    } catch (e) {
      console.log("ERROR!", e);
    }
  }
};

export default {
  scrapeVideoMessages,
  populateMissingHashesTgSHA,
};