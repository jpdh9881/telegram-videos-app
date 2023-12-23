import "dotenv/config";
import { argv } from "node:process";
import { AppDataSource } from "./data-source";
import { initServer } from "./server/routes";
import _telegramService from "./services/telegram.service";
import _jobService, { GetMissingHashesJob, ScrapeAndHashMessagesJob } from "./services/job.service";
import _discordService, { PostType } from "./services/discord.service";
import _loggerService from "./services/logger.service";

enum ChannelGroups {
  Generation1 = 1,
  Generation2 = 2,
  Aggregators1 = 3,
}

// Determine commands
//  e.g. node index.js -routine scrape
//  we want: "-routine scrape" and "--md5"
const cliCommandAndOption = (argv[2] ?? "") + " " + (argv[3] ?? "");
const cliSwitch = argv[4] ?? "";

AppDataSource.initialize().then(async () => {
  if (process.env.ENV === "DEV") {
    switch(cliCommandAndOption) {
      case "-routine sync": {
        // do nothing
        break;
      } case "-routine scrape-hash": {
        throw "Not ready yet";
        // This job is for new channels (we need to catch up with all their posts)
        await _telegramService.initTelegramClient(2);
        _loggerService.debug("Telegram client initialized.");
        let job = ScrapeAndHashMessagesJob.create(null, { groups: [ChannelGroups.Generation2] });
        await _discordService.sendDiscordNotification(PostType.DEBUG, "Starting scrape-hash for groups [2].");
        const totalMessages = await job.start();
        _loggerService.debug(`ScrapeAndHashMessagesJob[2] - did ${totalMessages} messages`);
        break;
      } case "-routine scrape-hash-agg": {
        throw "Not ready yet.";
        const job = ScrapeAndHashMessagesJob.create(null, { groups: [ChannelGroups.Aggregators1] });
        await _discordService.sendDiscordNotification(PostType.DEBUG, "Starting scrape-hash-agg.");
        const totalMessages = await job.start();
        _loggerService.debug(`ScrapeAndHashMessagesJob[aggregators] - did ${totalMessages} messages`);
        break;
      } case "-routine just-hashes": {
        await _telegramService.initTelegramClient(2);
        const job = GetMissingHashesJob.create();
        await _discordService.sendDiscordNotification(PostType.DEBUG, "Starting GetMissingHashesJob.");
        const totalMessages = await job.start();
        _loggerService.debug(`GetMissingHashesJob - did ${totalMessages} messages`);
        break;
      } default: {
        // This runs cron jobs
        //  - primarily for channels which we have caught up to and just need regular updates for
        await _telegramService.initTelegramClient(1);
        _loggerService.debug("Telegram client initialized.");
        _loggerService.debug("Invalid or no commands provided. Starting CRON jobs.");
        // https://superuser.com/questions/411406/set-a-cron-every-certain-hours-between-certain-hours
        const scrapeAndHashJob = ScrapeAndHashMessagesJob.create("0 7,10,13,15,18,21,0 * * *", { groups: [ChannelGroups.Generation1, ChannelGroups.Generation2], discordUpdates: true });
        const crons = [
          scrapeAndHashJob,
          // botStatus,
        ];
        const jobs = _jobService.runCronJobs(crons);
        await _discordService.sendDiscordNotification(PostType.DEBUG, "Cron Bot has started.");
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
    await _discordService.sendDiscordNotification(PostType.DEBUG, "Error: " + err);
    server.log.error(err);
    process.exit(1);
  }
}).catch(error => _loggerService.error(error));
