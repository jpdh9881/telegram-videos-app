import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, JoinColumn } from "typeorm"

@Entity()
export class Message1 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "int", nullable: false })
    tg_id: number;

    @Column({ type: "int", nullable: false })
    tg_date: number;

    @Column({ type: "int", nullable: true })
    tg_edit_date: number;

    @Column({ type: "text" })
    tg_message: string;

    @Column({ type: "json", nullable: false })
    raw: string;

    // Relations
    // @ManyToOne(() => Channel1, (channel) => channel.messages, { nullable: true })
    // @JoinColumn({ name: "channel_id" })
    // channel: Channel1;
    @Column()
    channel_id: number;

    // @OneToOne(() => Document1)
    // document: Document1;

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
