import "dotenv/config";
import { argv } from "node:process";
import { AppDataSource } from "./data-source";
import { initServer } from "./server/routes";
import { TelegramClient } from "telegram";
import TelegramService from "./services/telegram.service";
import JobService from "./services/job.service";

// Determine commands
//  e.g. node index.js -routine scrape
//  we want: "-routine scrape" and "--md5"
const cliCommandAndOption = (argv[2] ?? "") + " " + (argv[3] ?? "");
const cliSwitch = argv[4] ?? "";

AppDataSource.initialize().then(async () => {
  console.log(AppDataSource.isInitialized);

  if (process.env.ENV === "DEV") {
    // Set up Telegram
    // initialize the telegram client
    await TelegramService.initTelegramClient();
    const _tg: TelegramClient = TelegramService.getClient();
    console.log("Telegram client initialized.");

    switch(cliCommandAndOption) {
      case "-routine sync": {
        // do nothing
        break;
      } case "-routine scrape-hash": {
        const totalMessages = await JobService.scrapeAndHashMessages(false);
        console.log(`JobService.scrapeAndHashMessages() - did ${totalMessages} messages`);
        break;
      } default: {
        console.log("Invalid or no commands provided. Starting CRON jobs.");
        const jobs = JobService.runCronJobs([
          { func: JobService.scrapeAndHashMessages, cron: "0 * * * *"},
        ]);
        console.log("Started these jobs:", jobs);
      }
    }
  }

  // Set up and run the server
  const server = await initServer();
  try {
    console.log("Listening...");
    await server.listen({
      port: 3000,
      host: "127.0.0.1",
    });
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}).catch(error => console.log(error));
