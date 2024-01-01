import { Api } from "telegram";
import { AppDataSource } from "../data-source";
import { Message1 } from "../entity/Message1";
import { Document1 } from "../entity/Document1";
import { ProcessedStatus1 } from "../entity/ProcessedStatus1";
import { Channel1 } from "../entity/Channel1";
import { Hash1 } from "../entity/Hash1";

export interface MessagesWithoutHashes { message_id: number; message_tg_id: number; document_id: number; channel_id: number; channel_name: string; }
const getMessagesWithoutHashes = async (): Promise<MessagesWithoutHashes[]> => {
  return AppDataSource.getRepository(Message1).createQueryBuilder("message")
    .leftJoinAndSelect(Channel1, "channel", "channel.id = message.channel_id")
    .leftJoinAndSelect(Document1, "document", "document.message_id = message.id")
    .select([ "message.id", "message.tg_id", "document.id", "channel.id", "channel.name" ])
    .where("document.hash_id IS NULL")
    .take(1000)
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

export interface SaveMessageAndHashResult { message: Message1, document: Document1, hash: Hash1, processedStatus: ProcessedStatus1 }
const saveMessageAndHash = async (channelId: number, message: Api.Message, hashStr: string): Promise<SaveMessageAndHashResult> => {
  let result: SaveMessageAndHashResult = {
    message: null,
    document: null,
    hash: null,
    processedStatus: null,
  };
  await AppDataSource.transaction(async transactionEntityManager => {
    const media = message.media as Api.MessageMediaDocument;

    // Message
    const m = new Message1();
    m.tg_id = message.id;
    m.tg_date = message.date;
    m.tg_edit_date = message.editDate;
    m.tg_message = message.message;
    m.channel_id = channelId;
    m.raw = message;
    await transactionEntityManager.save(m);
    result.message = m;

    // Hash
    if (hashStr === null) {
      result.hash = null;
    } else {
      const hashResult = await transactionEntityManager.upsert(
        Hash1,
        [{ tg_sha256: hashStr, tg_sha256_date: new Date(), }],
        [ "tg_sha256" ],
      );
      const h = new Hash1();
      h.id = hashResult.identifiers[0].id;
      h.tg_sha256 = hashStr;
      h.tg_sha256_date = hashResult.generatedMaps[0].tg_sha256_date;
      h.created_at = hashResult.generatedMaps[0].created_at;
      h.updated_at = hashResult.generatedMaps[0].updated_at;
      result.hash = h;
    }

    // Document
    const document = media?.document as Api.Document;
    const d = new Document1();
    d.id = m.id;
    d.message_id = m.id;
    if (document) {
      const attributeA = (document.attributes as any).find(a => a.duration);
      const attributeB = (document.attributes as any).find(a => a.fileName);
      d.hash_id = result.hash ? result.hash.id : null;
      d.tg_id = document.id.toJSNumber();
      d.tg_date = document.date;
      d.tg_mime_type = document.mimeType;
      d.tg_duration = attributeA?.duration ?? null;
      d.tg_w = attributeA?.w ?? null;
      d.tg_h = attributeA?.h ?? null;
      d.tg_file_name = attributeB?.fileName ?? null;

      const photoStrippedSize = document?.thumbs?.find(th => th.className === "PhotoStrippedSize");
      if (photoStrippedSize) {
        d.tg_thumb_PhotoStrippedSize = photoStrippedSize.getBytes().toJSON().data;
      }
    }
    await transactionEntityManager.save(d);
    result.document = d;

    // ProcessedStatus
    const ps = new ProcessedStatus1();
    ps.id = m.id;
    ps.document_id = m.id;
    ps.tg_sha256 = true;
    ps.tg_sha256_date = new Date();
    await transactionEntityManager.save(ps);
    result.processedStatus = ps;
  });
  return result;
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

export default {
  getMessagesWithoutHashes,
  saveMessages,
  saveMessageAndHash,
  getMessagesByDate,
};