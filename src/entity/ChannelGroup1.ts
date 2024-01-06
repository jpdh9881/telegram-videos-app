import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class ChannelGroup1 {
    @PrimaryGeneratedColumn()
    id: ChannelGroups;

    @Column({ type: "varchar", length: 256, unique: true, nullable: false })
    name: string;

    // Auditable
    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}

// Pay attention to the db -- must be in sync with the db!
export enum ChannelGroups {
    Generation1 = 1,
    Generation2 = 2,
    Aggregators1 = 3,
    Aggregators2 = 4,
    TempCatchup = 5,
    Generation2b = 6, // had to split up Generation2's channels to speed up the process
  }