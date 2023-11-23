import "dotenv/config";
import { argv } from "node:process";
import { AppDataSource } from "./data-source";
import { initServer } from "./server/routes";
import { TelegramClient } from "telegram";
import _telegramService from "./services/telegram.service";
import _jobService, { ScrapeAndHashMessagesAggregatorsJob, ScrapeAndHashMessagesRegularJob } from "./services/job.service";
import _discordService from "./services/discord.service";
import _loggerService from "./services/logger.service";

// Determine commands
//  e.g. node index.js -routine scrape
//  we want: "-routine scrape" and "--md5"
const cliCommandAndOption = (argv[2] ?? "") + " " + (argv[3] ?? "");
const cliSwitch = argv[4] ?? "";

AppDataSource.initialize().then(async () => {
  if (process.env.ENV === "DEV") {
    // Set up Telegram
    // initialize the telegram client
    await _telegramService.initTelegramClient();
    const _tg: TelegramClient = _telegramService.getClient();
    _loggerService.debug("Telegram client initialized.");

    switch(cliCommandAndOption) {
      case "-routine sync": {
        // do nothing
        break;
      } case "-routine scrape-hash": {
        const job = ScrapeAndHashMessagesRegularJob.create();
        const totalMessages = await job.start();
        _loggerService.debug(`ScrapeAndHashMessagesRegularJob - did ${totalMessages} messages`);
        break;
      } case "-routine scrape-hash-agg": {
        _discordService.suppressNotifications();
        const job = ScrapeAndHashMessagesAggregatorsJob.create();
        const totalMessages = await job.start();
        _loggerService.debug(`ScrapeAndHashMessagesAggregatorsJob - did ${totalMessages} messages`);
        _discordService.allowNotifications();
        break;
      } default: {
        _loggerService.debug("Invalid or no commands provided. Starting CRON jobs.");
        // const botStatus = ScrapeAndHashMessagesRegularJob.create("0 * * * *");
        const scrapeAndHashRegularJob = ScrapeAndHashMessagesRegularJob.create("0 */2 * * *");
        // const scrapeAndHashAggregatorsJob = ScrapeAndHashMessagesRegularJob.create("0 */2 * * *");
        const crons = [
          scrapeAndHashRegularJob,
          // scrapeAndHashAggregatorsJob,
          // botStatus,
        ];
        const jobs = _jobService.runCronJobs(crons);
        await _discordService.sendDiscordNotification("Bot has started.");
        _loggerService.debug(`Started ${crons.length} jobs.`);
      }
    }
  }

  // Set up and run the server
  const server = await initServer();
  try {
    _loggerService.debug("Listening vif zuh server...");
    await server.listen({
      port: 3000,
      host: "127.0.0.1",
    });
  } catch (err) {
    await _discordService.sendDiscordNotification("Error: " + err);
    server.log.error(err);
    process.exit(1);
  }
}).catch(error => _loggerService.error(error));
