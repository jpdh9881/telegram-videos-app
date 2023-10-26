import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, JoinColumn, ManyToOne } from "typeorm"

@Entity()
export class MessageLog1 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "int", nullable: false })
    number_added: number;

    @Column("simple-array")
    tg_message_ids: number[];

    // Relations
    // @ManyToOne(() => Channel1, (channel) => channel.messageLogs, { nullable: true })
    // @JoinColumn({ name: "channel_id" })
    // channel: Channel1;

    @Column()
    channel_id: number;

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
