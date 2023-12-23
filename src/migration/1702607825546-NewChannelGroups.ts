import { MigrationInterface, QueryRunner } from "typeorm"

export class NewChannelGroups1702607825546 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO channel_group1 (name) VALUES
                ('aliveiswell1');`
        );
        await queryRunner.query(
            `INSERT INTO channel_group1 (name) VALUES
                ('aliveiswell2');`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM channel_group1 WHERE name IN ('aliveiswell1', 'aliveiswell2');`
        );
    }
}
