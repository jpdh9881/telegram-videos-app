import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, JoinColumn } from "typeorm"

@Entity()
export class Hash1 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "text", unique: true, nullable: true })
    tg_sha256?: string;

    @Column({ type: "datetime", nullable: true, default: () => "CURRENT_TIMESTAMP()" })
    tg_sha256_date?: Date;

    // Relations
    // @OneToMany(() => Document1, (document) => document.hash)
    // documents: Document1[];

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
