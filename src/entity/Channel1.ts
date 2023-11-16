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

    // Relations
    // @OneToMany(() => Message1, (message) => message.channel)
    // messages: Message1[];

    // @OneToMany(() => MessageLog1, (messageLog) => messageLog.channel)
    // messageLogs: MessageLog1[];

    @Column({ type: "boolean", default: false })
    aggregator: boolean;

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
