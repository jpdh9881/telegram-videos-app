import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from "typeorm"
import { Document } from "./Document";

@Entity()
export class Hash {
    @OneToMany(() => Document, (document) => document.hash_id)
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 256, unique: true, nullable: true })
    tg_sha256: string;

    @Column({ type: "datetime", nullable: false, default: () => "CURRENT_TIMESTAMP()" })
    tg_sha256_date: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
