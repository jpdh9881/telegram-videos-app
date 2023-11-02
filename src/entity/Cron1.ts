import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class Cron1 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 256, unique: true, nullable: false })
    job: string;

    @Column({ type: "boolean", default: false })
    on: boolean;

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
