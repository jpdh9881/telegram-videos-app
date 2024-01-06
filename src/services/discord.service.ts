import axios from "axios";
import { DuplicateVideos } from "./duplicate.service";
import _loggerService from "./logger.service";
import { delay } from "../utility/delay.utility";
import { toEST } from "../utility/datetime.utility";

const MAX_CONTENT_SIZE = 2000; // from https://discord.com/developers/docs/resources/webhook
const DELAY_TIME = 5000;
export enum DiscordChannel {
  UPDATE,
  DEBUG,
}

let _suppressNotifications = false;
const suppressNotifications = () => {
  _suppressNotifications = true;
};

const allowNotifications = () => {
  _suppressNotifications = false;
};

const sendDiscordNotification = async (postType: DiscordChannel, message: string, suppressTgInstanceId: boolean = false): Promise<void> => {
  if (_suppressNotifications) {
    _loggerService.debug("(suppressed discord message)");
    return;
  }
  if (!suppressTgInstanceId) {
    message = "(" + _loggerService.getTgInstanceId() + ") " + message;
  }
  let messages = [];
  // Split into <= MAX_CONTENT_SIZE chunks
  while (message.length > MAX_CONTENT_SIZE) {
    // find nearest new line and slice there
    const maxSlice = message.slice(0, MAX_CONTENT_SIZE);
    const lastNewLine = maxSlice.lastIndexOf("\n");
    if (lastNewLine === -1) throw "Can't split this behemoth.";
    const manageableSlice = message.slice(0, lastNewLine);

    // add this slice to messages array
    messages.push(manageableSlice);

    // remove this slice from total message
    message = message.slice(lastNewLine);
  }
  // take care of < MAX_CONTENT_SIZE slice
  if (message.length > 0) {
    messages.push(message);
  }

  let resource;
  switch (postType) {
    case DiscordChannel.UPDATE:
      resource = process.env.DISCORD_WEBHOOK_URL;
      break;
    case DiscordChannel.DEBUG:
    default:
      resource = process.env.DISCORD_WEBHOOK_URL_DEBUG;
      break;
  }
  let after1stMessage = false;
  for (const message of messages) {
    // "(continued)" indicator message
    if (after1stMessage) {
      await axios.post(resource, { content: "(continued)" });
      await delay(DELAY_TIME);
    }
    await axios.post(resource, { content: message });
    await delay(DELAY_TIME);
    after1stMessage = true;
  }
  return Promise.resolve();
};

export interface NewMessageLoggedAlertOptions { duplicates?: DuplicateVideos }
const createNewMessageLoggedAlert = (postType: DiscordChannel, channelName: string, messageTgId: number, { duplicates }: NewMessageLoggedAlertOptions) => {
  const date = duplicates.byHash.filter(dupe => dupe.channel_name === channelName && dupe.message_tg_id === messageTgId)[0]?.document_date;
  // Process duplicates
  //  - remove this message
  const hashDupes = duplicates.byHash.filter(dupe => dupe.channel_name !== channelName && dupe.message_tg_id !== messageTgId);
  hashDupes.sort((a, b) => b.document_tg_date - a.document_tg_date);
  //  - allow duplicate durations if they're > 300 seconds + remove this message
  duplicates.byDuration = duplicates.byDuration.filter(dupe => dupe.tg_duration !== null && dupe.tg_duration > 300 && dupe.channel_name !== channelName && dupe.message_tg_id !== messageTgId);
  duplicates.byDuration.sort((a, b) => b.document_tg_date - a.document_tg_date);
  //  - allow duplicate file_names if there are <= 5 + remove this message
  duplicates.byFileName.sort((a, b) => b.document_tg_date - a.document_tg_date);
  duplicates.byFileName = duplicates.byFileName.filter(dupe => dupe.tg_file_name !== null && dupe.channel_name !== channelName && dupe.message_tg_id !== messageTgId);
  duplicates.byFileName = duplicates.byFileName.length > 5 ? [] : duplicates.byFileName;
  const otherDupes = duplicates.byDuration.filter(dupe => duplicates.byFileName.findIndex(dupe_ => dupe_.message_id === dupe.message_id));

  const message = new MessageBuilder();
  if (hashDupes.length > 0) {
    message.add(":red_circle: ");
  } else if (otherDupes.length > 0) {
    message.add(":orange_circle: ");
  } else {
    message.add(":green_circle: ");
  }
  message.addCode(date ? toEST(date) : "no date" );
  message.addAndEndLine(`, <https://t.me/${channelName}/${messageTgId}>`);

  if (hashDupes.length > 0 || otherDupes.length > 0) {
    if (hashDupes.length > 0) {
      hashDupes.forEach(d => {
        message.add("\t:grey_exclamation: ");
        message.addCode(d ? toEST(d.document_date) : "no date")
        message.addAndEndLine(`, <${d.link}>`);
      });
    }
    if (otherDupes.length > 0) {
      otherDupes.forEach(d => {
        message.add("\t:grey_question: ");
        message.addCode(d ? toEST(d.document_date) : "no date")
        message.addAndEndLine(`, <${d.link}>`);
      });
    }
  }
  return sendDiscordNotification(postType, message.toString(), true);
};

export class MessageBuilder {
  private message: string | undefined;

  public constructor(initStr: string = "") {
    this.message = initStr;
  }

  public add(str: string) {
    this.message += str;
  }

  public addAndEndLine(str?: string) {
    this.message += (str ?? "") + "\n";
  }

  public addCode(str: string = "") {
    this.message += "`" + str + "`";
  }

  public addLine(str: string = "") {
    this.add("\n" + str);
  }

  public addLineCode(str: string = "") {
    this.message += "\n`" + str + "`";
  }

  public clear(str: string = "") {
    this.message = str;
  }

  public toString() {
    return this.message;
  }
}

// Testing

// const msg = "0123456789012345678901234\n5678901234567890123456789012345678901234567890123\n4567890123456789\n0123456789";
// let msg_ = "";
// for (let i = 0; i <125; i++) {
//   msg_ += msg;
// }
// sendDiscordNotification(msg_);

export default {
  suppressNotifications,
  allowNotifications,
  _suppressNotifications,
  sendDiscordNotification,
  createNewMessageLoggedAlert,
};