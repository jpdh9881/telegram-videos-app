import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Channel1 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "boolean", default: true })
    active: boolean;

    @Column({ type: "bigint", nullable: true })
    tg_id?: number;

    @Column({ type: "varchar", length: 256, unique: true, nullable: false })
    name: string;

    @Column({ type: "boolean", default: false })
    aggregator: boolean;

    @Column({ type: "int", nullable: false, default: 0 })
    channel_group: number;

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
