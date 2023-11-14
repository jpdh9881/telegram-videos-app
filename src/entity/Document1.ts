import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, ManyToOne, JoinColumn } from "typeorm"
import { Message1 } from "./Message1";

@Entity()
export class Document1 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "bigint", nullable: true })
    tg_id: number;

    @Column({ type: "int", nullable: true })
    tg_date: number;

    @Column({ type: "varchar", nullable: true, length: 256 })
    tg_mime_type: string;

    @Column({ type: "decimal", nullable: true })
    tg_duration: number;

    @Column({ type: "decimal", nullable: true })
    tg_w: number;

    @Column({ type: "decimal", nullable: true })
    tg_h: number;

    @Column({ type: "varchar", length: 1000, nullable: true })
    tg_file_name: string;

    // Relations
    // @OneToOne(() => Message1, { nullable: false })
    // @JoinColumn({ name: "message_id" })
    // message: Message1;
    @Column({ nullable: true})
    message_id: number;

    // @ManyToOne(() => Hash1, (hash) => hash.documents, { nullable: true })
    // @JoinColumn({ name: "hash_id" })
    // hash: Hash1;
    @Column({ nullable: true })
    hash_id: number;

    // @OneToOne(() => ProcessedStatus1, { nullable: true })
    // processedStatus: ProcessedStatus1;

    /**
     * in JSON from telegram: message.media.document.thumbs[]
     * {
     *    "type": "i",
     *    "bytes": {
     *      "type": "Buffer",
     *      "data": [1, 23, 40, 197, 162, 138, 40, 0, 162, 138, 40, 0, 162, 138, 40, 1, 204, 0, 198, 8, 57, 25, 250, 83, 104, 162, 128, 10, 40, 162, 128, 10, 40, 162, 128, 63]
     *    },
     *    "className": "PhotoStrippedSize"
     *  },
     */
    @Column({ type: "json", nullable: true })
    tg_thumb_PhotoStrippedSize: number[];

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
