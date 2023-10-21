import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from "typeorm"
import { Document } from "./Document";

@Entity()
export class ProcessedStatus {
    @PrimaryGeneratedColumn()
    id: number;

    @OneToOne(() => Document)
    @JoinColumn()
    @Column({ type: "int", nullable: false })
    document_id: number;

    @Column({ type: "bool", default: () => false })
    tg_sha256: boolean;

    @Column({ type: "datetime", nullable: true, default: () => "CURRENT_TIMESTAMP()" })
    tg_sha256_date: Date;

    @Column({ type: "json", nullable: true })
    tg_sha256_error: Object;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
