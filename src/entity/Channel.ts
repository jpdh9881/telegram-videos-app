import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { Message } from "./Message";

@Entity()
export class Channel {
    @OneToMany(() => Message, (message) => message.channel_id)
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "bigint", nullable: true })
    tg_id: number;

    @Column({ type: "varchar", length: 256, unique: true, nullable: false })
    name: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
