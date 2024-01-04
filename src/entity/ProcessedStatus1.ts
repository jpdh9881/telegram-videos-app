import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from "typeorm"

@Entity()
export class ProcessedStatus1 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "bool", default: () => false })
    tg_sha256: boolean;

    @Column({ type: "datetime", nullable: true })
    tg_sha256_date: Date;

    @Column({ type: "text", nullable: true })
    tg_sha256_error: Object;

    // Relations
    // @OneToOne(() => Document1, { nullable: false })
    // @JoinColumn({ name: "document_id" })
    // document: Document1;
    @Column({ nullable: true })
    document_id: number;

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
