import "dotenv/config";
import { argv } from "node:process";
import { AppDataSource } from "./data-source";
import { initServer } from "./server/routes";
import _telegramService from "./services/telegram.service";
import _jobService, { ChannelStatsJob, GetMissingHashesJob, ScrapeAndHashMessagesJob } from "./services/job.service";
import _discordService, { PostType } from "./services/discord.service";
import _loggerService from "./services/logger.service";
import { ChannelGroups } from "./entity/ChannelGroup1";
import _channelService from "./services/channel.service";

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
        await _telegramService.initTelegramClient(2);
        _loggerService.debug("Telegram client initialized. Executing cron jobs...");
        // const cronStr = "0 6,9,12,15,18,21,0 * * *";
        const scrapeAndHashJob = ScrapeAndHashMessagesJob.create("0 7,10,13,16,19,22,0 * * *", { groups: [ChannelGroups.Generation1], discordUpdates: true });
        const channelStatsJob = ChannelStatsJob.create("0 5 * * *", null);
        const crons = [
          scrapeAndHashJob,
          channelStatsJob,
        ];
        const jobs = _jobService.runCronJobs(crons);
        await _discordService.sendDiscordNotification(PostType.DEBUG, `Cron Bot scheduling ${crons.length} jobs: \`${crons.map(c => `${c.signature} (${c.cron})`)}\``);
        _loggerService.debug(`Executed ${crons.length} jobs.`);
        break;
      } case "-job sync": {
        _loggerService.debug("Syncing ORM model with db...");
        // do nothing: this is for pushing ORM model changes to db
        break;
      } case "-job test": {
        console.log(_channelService.getChannelIds({ groups: [ 2 ]}));
        break;
      } case "-job channel-stats": {
        let job = ChannelStatsJob.create(null, {});
        await job.execute();
        break;
      } case "-job scrape-hash-1": {
        const groups = [ ChannelGroups.Aggregators1 ];
        // This job is for new channels (we need to catch up with all their posts)
        await _telegramService.initTelegramClient(3);
        _loggerService.debug("Telegram client initialized. Executing scrape and hash on [ChannelGroups.Aggregators1]...");
        let job = ScrapeAndHashMessagesJob.create(null, { groups });
        const totalMessages = await job.execute();
        _loggerService.debug(`ScrapeAndHashMessagesJob[ChannelGroups.Aggregators1] - did ${totalMessages} messages`);
        break;
      } case "-job scrape-hash-2": {
        const groups = [ ChannelGroups.Generation2 ];
        // This job is for new channels (we need to catch up with all their posts)
        await _telegramService.initTelegramClient(1);
        _loggerService.debug("Telegram client initialized. Executing scrape and hash on ChannelGroups.Generation2...");
        let job = ScrapeAndHashMessagesJob.create(null, { groups });
        const totalMessages = await job.execute();
        _loggerService.debug(`ScrapeAndHashMessagesJob[ChannelGroups.Generation2] - did ${totalMessages} messages`);
        break;
      } case "-job just-hashes": {
        // await _telegramService.initTelegramClient(2);
        // _loggerService.debug("Telegram client initialized. Getting missing hashes and saving to db...");
        // const job = GetMissingHashesJob.create();
        // await _discordService.sendDiscordNotification(PostType.DEBUG, "executeing GetMissingHashesJob.");
        // const totalMessages = await job.execute();
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
      port: 3003,
      host: "127.0.0.1",
    });
  } catch (err) {
    await _discordService.sendDiscordNotification(PostType.DEBUG, "Error: " + err);
    server.log.error(err);
    process.exit(1);
  }
}).catch(error => _loggerService.error(error));
