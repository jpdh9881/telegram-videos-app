import { MigrationInterface, QueryRunner } from "typeorm"

export class AddCronJobScrapeAndHashMessages1698630724913 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT INTO cron1 (job, \`on\`) VALUES
                ('scrapeAndHashMessages', false);`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `DELETE FROM cron1 WHERE job = 'scrapeAndHashMessages';`
        );
    }

}
