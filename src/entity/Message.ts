import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, JoinColumn } from "typeorm"
import { Channel } from "./Channel";
import { Document } from "./Document";

@Entity()
export class Message {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Channel, (channel) => channel.id)
    @JoinColumn()
    @Column({ type: "int", nullable: false })
    channel_id: number;

    @OneToOne(() => Document)
    @JoinColumn()
    @Column({ type: "int", nullable: false })
    document_id: number;

    @Column({ type: "bigint", nullable: false })
    tg_id: number;

    @Column({ type: "int", nullable: false })
    tg_date: number;

    @Column({ type: "int", nullable: true })
    tg_edit_date: number;

    @Column({ type: "text" })
    tg_message: string;

    @Column({ type: "json", nullable: false })
    raw: Object;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
