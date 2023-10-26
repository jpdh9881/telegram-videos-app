import { Api } from "telegram";
import { AppDataSource } from "../data-source";
import { Message1 } from "../entity/Message1";
import { Document1 } from "../entity/Document1";
import { ProcessedStatus1 } from "../entity/ProcessedStatus1";
import { MessageLog1 } from "../entity/MessageLog1";
import { Channel1 } from "../entity/Channel1";

export interface MessagesWithoutHashes { message_id: number; message_tg_id: number; document_id: number; channel_id: number; channel_name: string; }
const getMessagesWithoutHashes = async (): Promise<MessagesWithoutHashes[]> => {
  return AppDataSource.getRepository(Message1).createQueryBuilder("message")
    .leftJoinAndSelect(Channel1, "channel", "channel.id = message.channel_id")
    .leftJoinAndSelect(Document1, "document", "document.message_id = message.id")
    .leftJoin(ProcessedStatus1, "ps", "ps.document_id = document.id")
    .select([ "message.id", "message.tg_id", "document.id", "channel.id", "channel.name" ])
    .where("ps.tg_sha256 = 0 and ps.tg_sha256_error IS NULL")
    .getRawMany() as unknown as Promise<MessagesWithoutHashes[]>;
};

const getMessagesByDate = async (from: number, to?: number): Promise<any[]> => {
  if (!to) {
    to = Date.now();
  }
  return AppDataSource.getRepository(Message1).createQueryBuilder("message")
    .innerJoinAndSelect(Channel1, "channel", "channel.id = message.channel_id")
    .innerJoinAndSelect(Document1, "document", "document.message_id = message.id")
    .innerJoin(ProcessedStatus1, "ps", "ps.document_id = document.id")
    .select("channel.name", "channel")
    .addSelect("message.tg_id", "message_id")
    .addSelect("document.tg_mime_type", "mime_type")
    .addSelect("document.tg_duration", "duration")
    .addSelect("document.tg_file_name", "file_name")
    .addSelect("FROM_UNIXTIME(document.tg_date)", "date")
    .addSelect("CONCAT('https://t.me/', channel.name, '/', message.tg_id)", "link")
    .where("ps.tg_sha256 = 1")
    .andWhere("(document.tg_date * 1000) >= :from and (document.tg_date * 1000) <= :to", { from, to } )
    .getRawMany();
};

const saveMessages = async (channelId: number, messages: Api.Message[]): Promise<void> => {
  await AppDataSource.transaction(async transactionEntityManager => {
    for (const m of messages) {
      const media = m.media as Api.MessageMediaDocument;
      const document = media.document as Api.Document;
      const attributeA = (document.attributes as any).find(a => a.duration);
      const attributeB = (document.attributes as any).find(a => a.fileName);
      const newMessage = await transactionEntityManager.createQueryBuilder()
        .insert()
        .into(Message1)
        .values([
          {
            tg_id: m.id,
            tg_date: m.date,
            tg_edit_date: m.editDate,
            tg_message: m.message,
            channel_id: channelId,
            raw: JSON.stringify(m),
          }
        ])
        .execute();
      const messageId = newMessage.identifiers[0].id;
      await transactionEntityManager.createQueryBuilder()
        .insert()
        .into(Document1)
        .values([
          {
            message_id: messageId,
            tg_id: document.id.toJSNumber(),
            tg_date: document.date,
            tg_mime_type: document.mimeType,
            tg_duration: attributeA?.duration ?? null,
            tg_w: attributeA?.w ?? null,
            tg_h: attributeA?.h ?? null,
            tg_file_name: attributeB?.fileName ?? null,
          }
        ])
        .execute();
      await transactionEntityManager.createQueryBuilder()
        .insert()
        .into(ProcessedStatus1)
        .values([
          {
            document_id: messageId,
          },
        ])
        .execute();
    }
  });
};

const logMessageUpdates = async (channelId: number, numAdded: number, tgMessageIds: number[]) => {
  const logEntry = new MessageLog1();
  const channel = new Channel1();
  channel.id = channelId;
  logEntry.channel_id = channelId
  logEntry.number_added = numAdded;
  logEntry.tg_message_ids = tgMessageIds;

  return AppDataSource.manager.save(logEntry);
};

export default {
  getMessagesWithoutHashes,
  saveMessages,
  logMessageUpdates,
  getMessagesByDate,
};