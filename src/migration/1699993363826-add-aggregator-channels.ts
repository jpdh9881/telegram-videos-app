import { MigrationInterface, QueryRunner } from "typeorm"

export class AddAggregatorChannels1699993363826 implements MigrationInterface {
    // Aggregator channels from gik (some videos are new)
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `INSERT IGNORE INTO channel1 (name, aggregator, created_at, updated_at)
             VALUES
                ('operativnoZSU', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('voynareal_ua', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('bochkala_war', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('vanek_nikolaev', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('The3rdForceUA', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('ukrbavovna', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('kordon1991', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('killpukin', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('ssternenko', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('ButusovPlus', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('in_factum', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP'),
                ('AFUStratCom', true, 'CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP')
            `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM channel1 WHERE name IN
            ('operativnoZSU',
            'voynareal_ua',
            'bochkala_war',
            'vanek_nikolaev',
            'The3rdForceUA',
            'ukrbavovna',
            'kordon1991',
            'killpukin',
            'ssternenko',
            'ButusovPlus',
            'in_factum',
            'AFUStratCom');
        `);
    }
}
