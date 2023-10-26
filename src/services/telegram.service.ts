import { Api, TelegramClient } from "telegram";
import { IterMessagesParams } from "telegram/client/messages";
import { getFileInfo } from "telegram/Utils";
import { StringSession } from "telegram/sessions";
import { input } from "input";

let CLIENT: TelegramClient = null;

const getClient = () => {
  return CLIENT;
};

const initTelegramClient = async (): Promise<void> => {
  const apiId = Number.parseInt(process.env.API_ID ?? "");
  const apiHash = process.env.API_HASH ?? "";
  const stringSession = new StringSession(process.env.SESSION_STRING ?? ""); // empty string starts login process

  // Init client
  CLIENT = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });

  // Start session
  await CLIENT.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
        await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });
  console.log("Connected to Telegram. Session string: " + CLIENT.session.save());
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

export interface GetVideoMessagesOptions { channel: string; afterId?: number; }
const getVideoMessages = async ({ channel, afterId }: GetVideoMessagesOptions) => {
  const options: Partial<IterMessagesParams> = {
    filter: new Api.InputMessagesFilterVideo,
  };
  if (afterId && afterId > 0) {
    options.reverse = true; // this is actually ASC!
    options.minId = afterId;
    options.limit = undefined;
  } else {
    options.reverse = true;  // this is actually ASC!
    options.limit = undefined;
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