import { Api, TelegramClient } from "telegram";
import { IterMessagesParams } from "telegram/client/messages";
import { getFileInfo } from "telegram/Utils";
import { StringSession } from "telegram/sessions";
import _loggerService from "./logger.service";
import input from "input";

let CLIENT: TelegramClient = null;

const getClient = () => {
  return CLIENT;
};

const initTelegramClient = async (instance: number): Promise<void> => {
  let apiId, apiHash, stringSession;
  switch (instance) {
    case 1:
      apiId = Number.parseInt(process.env.API_ID1 ?? "");
      apiHash = process.env.API_HASH1 ?? "";
      stringSession = new StringSession(process.env.SESSION_STRING1 ?? ""); // empty string starts login process
      break;
    case 2:
      apiId = Number.parseInt(process.env.API_ID2 ?? "");
      apiHash = process.env.API_HASH2 ?? "";
      stringSession = new StringSession(process.env.SESSION_STRING2 ?? ""); // empty string starts login process
    default:
      break;
  }

  // Init client
  CLIENT = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  // Start session
  await CLIENT.start({
    phoneNumber:async () => await input.text("Enter number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
        await input.text("Please enter the code you received: "),
    onError: (err) => _loggerService.error(err.message + "\n" + err.stack),
  });
  _loggerService.debug("Connected to Telegram. Session string: " + CLIENT.session.save());
  // return Promise.resolve();
};

const fetchChannelsInfo = async (channels: string[]) => {
  return CLIENT.invoke(
    new Api.channels.GetChannels({
      id: [channels[0]],
    })
  );
};

const downloadTgHash = async (message: Api.Message) => {
  const info = getFileInfo(message.media as Api.MessageMediaDocument);
  const sender = await CLIENT.getSender(info.dcId!);
  const res = await CLIENT.invokeWithSender(
    new Api.upload.GetFileHashes({
      location: info.location,
    }),
    sender
  );
  return res;
};

const getVideoMessage = async (channel: string) => {
  return CLIENT.getMessages(channel, {
    // reverse: true,
    limit: 1,
    filter: new Api.InputMessagesFilterVideo,
  });
};

export interface GetVideoMessagesOptions { channel: string; afterId?: number; limit?: number }
const getVideoMessages = async ({ channel, afterId, limit }: GetVideoMessagesOptions) => {
  const options: Partial<IterMessagesParams> = {
    filter: new Api.InputMessagesFilterVideo,
  };
  if (afterId && afterId >= 0) {
    options.reverse = true; // this is actually ASC!
    options.minId = afterId;
    options.limit = limit;
  } else {
    options.reverse = true;  // this is actually ASC!
    options.limit = limit;
  }
  return CLIENT.getMessages(channel, options);
};

const getVideoMessagesByIds = async (channelName: string, tgIds: number[]) => {
  return CLIENT.getMessages(channelName, { ids: tgIds });
};

export default {
  getClient,
  initTelegramClient,
  fetchChannelsInfo,
  downloadTgHash,
  getVideoMessage,
  getVideoMessages,
  getVideoMessagesByIds,
};