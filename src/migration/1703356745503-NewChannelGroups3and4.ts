import { MigrationInterface, QueryRunner } from "typeorm"

export class NewChannelGroups3and41703356745503 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO channel_group1 (name) VALUES
                ('aliveiswell3_agg');`
        );
        await queryRunner.query(
            `INSERT INTO channel_group1 (name) VALUES
                ('aliveiswell4_agg');`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}