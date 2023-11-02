import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, JoinColumn, ManyToOne } from "typeorm"

@Entity()
export class JobLog1 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "int", nullable: true })
    job_id: number;

    @Column({ type: "varchar", length: 256, nullable: false })
    job: string;

    @Column({ type: "int", nullable: false })
    number_messages: number;

    @Column({ type: "boolean", default: false })
    and_hashes: boolean;

    @Column({ type: "json", default: null, nullable: true })
    error?: unknown;

    @Column({ type: "datetime", nullable: true })
    finished_at: Date;

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
