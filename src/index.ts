import "dotenv/config";
import { argv } from "node:process";
import { AppDataSource } from "./data-source";
import { initServer } from "./server/routes";
import _telegramService from "./services/telegram.service";
import _jobService, { GetMissingHashesJob, ScrapeAndHashMessagesJob } from "./services/job.service";
import _discordService, { PostType } from "./services/discord.service";
import _loggerService from "./services/logger.service";
import { Channel } from "node:diagnostics_channel";

// Pay attention to the db
enum ChannelGroups {
  Generation1 = 1,
  Generation2 = 2,
  Aggregators1 = 3,
  Aggregators2 = 4,
  TempCatchup = 5,
}

// Determine commands
//  e.g. node index.js -routine scrape
//  we want: "-routine scrape" and "--md5"
const cliCommandAndOption = (argv[2] ?? "") + " " + (argv[3] ?? "");
const cliSwitch = argv[4] ?? "";

AppDataSource.initialize().then(async () => {
  if (process.env.ENV === "DEV") {
    switch(cliCommandAndOption) {
      case "-job crons": {
        // This runs cron jobs
        //  - primarily for channels which we have caught up to and just need regular updates for
        await _telegramService.initTelegramClient(3);
        _loggerService.debug("Telegram client initialized. Starting cron jobs...");
        // https://superuser.com/questions/411406/set-a-cron-every-certain-hours-between-certain-hours
        // const cronStr = "0 6,9,12,15,18,21,0 * * *";
        const cronStr = "45 7,10,13,16,19,22,0 * * *";
        const scrapeAndHashJob = ScrapeAndHashMessagesJob.create(cronStr, { groups: [ChannelGroups.Generation1, ChannelGroups.Generation2], discordUpdates: true });
        const crons = [
          scrapeAndHashJob,
          // botStatus,
        ];
        const jobs = _jobService.runCronJobs(crons);
        await _discordService.sendDiscordNotification(PostType.DEBUG, "Cron Bot has started.");
        _loggerService.debug(`Started ${crons.length} jobs.`);
        break;
      } case "-job sync": {
        _loggerService.debug("Syncing ORM model with db...");
        // do nothing: this is for pushing ORM model changes to db
        break;
      } case "-job scrape-hash-1": {
        const groups = [ ChannelGroups.Aggregators1 ];
        // This job is for new channels (we need to catch up with all their posts)
        await _telegramService.initTelegramClient(1);
        _loggerService.debug("Telegram client initialized. Starting scrape and hash on [Aggregators1]...");
        let job = ScrapeAndHashMessagesJob.create(null, { groups });
        const totalMessages = await job.start();
        _loggerService.debug(`ScrapeAndHashMessagesJob[2] - did ${totalMessages} messages`);
        break;
      } case "-job scrape-hash-2": {
        const groups = [ ChannelGroups.Aggregators2 ];
        // This job is for new channels (we need to catch up with all their posts)
        await _telegramService.initTelegramClient(2);
        _loggerService.debug("Telegram client initialized. Starting scrape and hash on ChannelGroups.Aggregators2...");
        let job = ScrapeAndHashMessagesJob.create(null, { groups });
        const totalMessages = await job.start();
        _loggerService.debug(`ScrapeAndHashMessagesJob[ChannelGroups.Aggregators2] - did ${totalMessages} messages`);
        break;
      } case "-job just-hashes": {
        // await _telegramService.initTelegramClient(2);
        // _loggerService.debug("Telegram client initialized. Getting missing hashes and saving to db...");
        // const job = GetMissingHashesJob.create();
        // await _discordService.sendDiscordNotification(PostType.DEBUG, "Starting GetMissingHashesJob.");
        // const totalMessages = await job.start();
        // _loggerService.debug(`GetMissingHashesJob - did ${totalMessages} messages`);
        break;
      } default: {
        _loggerService.debug("Invalid or no commands provided. Doing nothing...");
      }
    }
  }

  // Set up and run the server
  const server = await initServer();
  try {
    _loggerService.debug("Listening with the server...");
    await server.listen({
      port: 3002,
      host: "127.0.0.1",
    });
  } catch (err) {
    await _discordService.sendDiscordNotification(PostType.DEBUG, "Error: " + err);
    server.log.error(err);
    process.exit(1);
  }
}).catch(error => _loggerService.error(error));
