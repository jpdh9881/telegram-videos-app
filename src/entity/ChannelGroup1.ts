import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class ChannelGroup1 {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: "varchar", length: 256, unique: true, nullable: false })
    name: string;

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
