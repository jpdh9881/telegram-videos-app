import "dotenv/config"; // need this so that migrations work!
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";

// Entities
import { Channel1 } from "./entity/Channel1";
import { Message1 } from "./entity/Message1";
import { Document1 } from "./entity/Document1";
import { Hash1 } from "./entity/Hash1";
import { ProcessedStatus1 } from "./entity/ProcessedStatus1";
import { MessageLog1 } from "./entity/MessageLog1";

// Migrations
import { AddChannels1697921775119 } from "./migration/1697921775119-add-channels";

const config: DataSourceOptions = {
    type: "mysql",
    host: process.env.MYSQLHOST ?? "localhost",
    port: parseInt(process.env.MYSQLPORT  ?? "3306"),
    username: process.env.MYSQLUSER ?? "root",
    password: process.env.MYSQLPASSWORD ?? "",
    database: process.env.MYSQLDATABASE ?? "telegram-videos",
    synchronize: true,
    logging: false,
    entities: [ Channel1, Message1, Document1, Hash1, ProcessedStatus1, MessageLog1 ],
    migrations: [ AddChannels1697921775119 ],
    subscribers: [],
};
export const AppDataSource = new DataSource(config);
