import { AppDataSource } from "../data-source";
import { ProcessedStatus1 } from "../entity/ProcessedStatus1";
import { UpdateResult } from "typeorm";

const saveProcessingError = async (documentId: number, error_message: string, json?: unknown): Promise<UpdateResult> => {
  return AppDataSource.createQueryBuilder()
    .update(ProcessedStatus1)
    .set({ tg_sha256_date: new Date(), tg_sha256_error: { message: error_message, json } })
    .where("id = :documentId", { documentId })
    .execute();
};

export default {
  saveProcessingError,
};