import "reflect-metadata";
import { DataSource } from "typeorm";

// Entities
import { Channel } from "./entity/Channel";
import { Message } from "./entity/Message";
import { Document } from "./entity/Document";
import { Hash } from "./entity/Hash";
import { ProcessedStatus } from "./entity/ProcessedStatus";
import { AddChannels1697921775119 } from "./migration/1697921775119-add-channels";

export const AppDataSource = new DataSource({
    type: "mysql",
    host: "localhost",
    port: 3306,
    username: "root",
    password: "",
    database: "telegram-videos",
    synchronize: true,
    logging: false,
    entities: [ Channel, Message, Document, Hash, ProcessedStatus ],
    migrations: [ AddChannels1697921775119 ],
    subscribers: [],
});