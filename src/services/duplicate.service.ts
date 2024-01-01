import { AppDataSource } from "../data-source";
import { Message1 } from "../entity/Message1";
import { Document1 } from "../entity/Document1";
import { Channel1 } from "../entity/Channel1";

export interface DuplicateVideoFields { message_id: number; message_tg_id: number; channel_name: string; document_tg_id: number; link: string; tg_duration: number; tg_mime_type: string; tg_file_name: string; document_tg_date: number; document_date: Date; }
export interface DuplicateVideos { byHash?: DuplicateVideoFields[]; byDuration?: DuplicateVideoFields[]; byFileName?: DuplicateVideoFields[] }
export interface GetDuplicatesOptions { hash: boolean; duration: boolean; fileName: boolean }
const getDuplicates = async (document: Document1, { hash, duration, fileName }: GetDuplicatesOptions): Promise<DuplicateVideos> => {
  const RETURN_FIELDS = "m.id as message_id, m.tg_id as message_tg_id, ch.name as channel_name, d.tg_id as document_tg_id, CONCAT('https://www.t.me/', ch.name, '/', m.tg_id) as link, d.tg_duration, d.tg_mime_type, d.tg_file_name, d.tg_date as document_tg_date, FROM_UNIXTIME(d.tg_date) as document_date";
  const result: DuplicateVideos = {};
  if (hash) {
    const response = await AppDataSource.createQueryBuilder()
      .select(RETURN_FIELDS)
      .from(Message1, "m")
      .innerJoin(Channel1, "ch", "ch.id = m.channel_id")
      .innerJoin(Document1, "d", "d.message_id = m.id")
      .where("d.hash_id = :hashId", { hashId: document.hash_id })
      .execute();
    result.byHash = response;
  }
  if (duration) {
    const response = await AppDataSource.createQueryBuilder()
      .select(RETURN_FIELDS)
      .from(Message1, "m")
      .innerJoin(Channel1, "ch", "ch.id = m.channel_id")
      .innerJoin(Document1, "d", "d.message_id = m.id")
      .where("d.tg_duration = :duration", { duration: document.tg_duration })
      .execute();
    result.byDuration = response;
  }
  if (fileName) {
    const response = await AppDataSource.createQueryBuilder()
      .select(RETURN_FIELDS)
      .from(Message1, "m")
      .innerJoin(Channel1, "ch", "ch.id = m.channel_id")
      .innerJoin(Document1, "d", "d.message_id = m.id")
      /**
       * Bug[Sat, 23 Dec 2023 19:43:32 GMT] - collation when using = comparison
       *  - case to binary to avoid collation mismatch error
       *  - I don't even know if this works properly!
       */
      .where("BINARY d.tg_file_name = BINARY :fileName", { fileName: document.tg_file_name })
      .execute();
    result.byFileName = response;
  }
  return result;
};

export default {
  getDuplicates,
};