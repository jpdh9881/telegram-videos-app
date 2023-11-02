import { Api } from "telegram";
import { AppDataSource } from "../data-source";
import { Document1 } from "../entity/Document1";
import { Hash1 } from "../entity/Hash1";
import { ProcessedStatus1 } from "../entity/ProcessedStatus1";


export interface SaveHashOptions { tg_sha256: string; }
const saveHash = async (documentId: number, tgSha256: string): Promise<boolean> => {
  let isNewHash;
  await AppDataSource.transaction(async transactionEntityManager => {
    const hashResult = await transactionEntityManager.createQueryBuilder()
      .insert()
      .into(Hash1)
      .values({
        tg_sha256: tgSha256,
        tg_sha256_date: new Date(),
      })
      .orUpdate([ "tg_sha256", "tg_sha256_date" ])
      .execute();

    isNewHash = hashResult.raw.affectedRows === 1;
    const hashId = hashResult.identifiers[0].id;
    await transactionEntityManager.createQueryBuilder()
      .update(Document1)
      .set({ hash_id: hashId })
      .where("id = :documentId", { documentId })
      .execute();

    await transactionEntityManager.createQueryBuilder()
      .update(ProcessedStatus1)
      .set({ tg_sha256: true, tg_sha256_date: new Date() })
      .where("id = :documentId", { documentId })
      .execute();
  });
  return Promise.resolve(isNewHash);
};

const joinTgHashes = (hashes: Api.FileHash[]): string => {
  hashes.sort((a, b) => a.offset.valueOf() - b.offset.valueOf());
  const json = hashes.map(hash => hash.hash.toJSON().data);
  const joined = json.join(";");
  return joined;
};

export default {
  saveHash,
  joinTgHashes,
};