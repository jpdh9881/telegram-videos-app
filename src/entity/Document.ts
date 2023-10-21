import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, ManyToOne, JoinColumn } from "typeorm"
import { Message } from "./Message";
import { Hash } from "./Hash";

@Entity()
export class Document {
    @OneToOne(() => Message)
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Hash, (hash) => hash.id)
    @JoinColumn()
    @Column({ type: "int", nullable: false })
    hash_id: number;

    @Column({ type: "bigint", nullable: false })
    tg_id: number;

    @Column({ type: "int", nullable: false })
    tg_date: number;

    @Column({ type: "varchar", length: 256 })
    tg_mime_type: string;

    @Column({ type: "decimal", nullable: true })
    tg_duration: number;

    @Column({ type: "decimal", nullable: true })
    tg_w: number;

    @Column({ type: "decimal", nullable: true })
    tg_h: number;

    @Column({ type: "varchar", length: 1000, nullable: true })
    tg_file_name: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
