import "dotenv/config"; // need this so that migrations work!
import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";

// Entities
import { Channel1 } from "./entity/Channel1";
import { Message1 } from "./entity/Message1";
import { Document1 } from "./entity/Document1";
import { Hash1 } from "./entity/Hash1";
import { ProcessedStatus1 } from "./entity/ProcessedStatus1";
import { JobLog1 } from "./entity/JobLog1";
import { Cron1 } from "./entity/Cron1";

// Migrations
import { AddChannels1697921775119 } from "./migration/1697921775119-add-channels";
import { AddCronJobScrapeAndHashMessages1698630724913 } from "./migration/1698630724913-AddCronJob_scrapeAndHashMessages";
import { AddAggregatorChannels1699993363826 } from "./migration/1699993363826-add-aggregator-channels";
import { ChannelGroup1 } from "./entity/ChannelGroup1";
import { NewChannelGroups1702607825546 } from "./migration/1702607825546-NewChannelGroups";
import { NewChannels1702609846977 } from "./migration/1702609846977-NewChannels";
import { NewChannelGroups3and41703356745503 } from "./migration/1703356745503-NewChannelGroups3and4";

const config: DataSourceOptions = {
    type: "mysql",
    host: process.env.MYSQLHOST ?? "localhost",
    port: parseInt(process.env.MYSQLPORT  ?? "3306"),
    username: process.env.MYSQLUSER ?? "root",
    password: process.env.MYSQLPASSWORD ?? "",
    database: process.env.MYSQLDATABASE ?? "telegram-videos",
    synchronize: false,
    logging: false,
    entities: [ Channel1, Message1, Document1, Hash1, ProcessedStatus1, JobLog1, Cron1, ChannelGroup1 ],
    migrations: [
        AddChannels1697921775119,
        AddCronJobScrapeAndHashMessages1698630724913,
        AddAggregatorChannels1699993363826,
        NewChannelGroups1702607825546,
        NewChannels1702609846977,
        NewChannelGroups3and41703356745503,
    ],
    subscribers: [],
};
export const AppDataSource = new DataSource(config);
