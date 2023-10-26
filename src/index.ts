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

  // Set up Telegram
  // initialize the telegram client
  await TelegramService.initTelegramClient();
  const _tg: TelegramClient = TelegramService.getClient();
  console.log("Telegram client initialized.");

  switch(cliCommandAndOption) {
    case "-routine hash": {
      switch(cliSwitch) {
        case "":
        case "--tg_sha":
          await JobService.populateMissingHashesTgSHA();
          console.log("Done JobService.populateMissingHashesTgSHA(15000)");
          break;
        default: {
          throw "Invalid switch for '-routine hash' command and option."
        }
      }
      break;
    } case "-routine scrape": {
      switch(cliSwitch) {
        case "":
        case "--new":
          await JobService.scrapeVideoMessages({ onlyNew: true });
          console.log("Done JobService.scrapeVideoMessages({ onlyNew: true })");
          break
        case "--all":
          await JobService.scrapeVideoMessages({ all: true });
          console.log("Done JobService.scrapeVideoMessages({ all: true })");
          break;
        default:
          throw "Invalid switch for '-routine scrape' command and option."
      }
      break;
    } default: {
      console.log("Invalid or no commands and options provided.")
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
