const nameOfThisThing = "Marshal Flork";

import _loggerService from "./services/logger.service";
_loggerService.configure("marshal");
_loggerService.debug(`${nameOfThisThing} started...`);
import _discordService, { DiscordChannel } from "./services/discord.service";
import { ChildProcess, fork } from "child_process"; // fork gets us new V8/node instances

const intended = {
  instances: [ "tg1", "tg2", "tg3", "tg4" ], // never have duplicates or Telegram will make life even more miserable
  jobs: [ "crons", "scrape-hash-1", "scrape-hash-2", "scrape-hash-3"  ],
};

// try to prevent stupid screw-ups that make Telegram angry for no good reason
const actual = {
  instances: Array.from(new Set(intended.instances)),
  jobs: Array.from(new Set(intended.jobs)),
};
if (actual.instances.length !== intended.instances.length) {
  throw "all instances must be unique";
} else if (actual.jobs.length !== intended.jobs.length) {
  throw "all jobs must be unique";
} else if (actual.instances.length !== actual.jobs.length) {
  throw "must have one instance per job";
}

// execute the jobs
interface Executed { instance: string; job: string; aSpawnOfTheEvilOne: ChildProcess }
const executed: Executed[] = [];
for (const [index, instance] of Array.from(actual.instances).entries()) {
  console.log(index, instance, actual.jobs[index]);
  const command = "src/index.ts";
  executed.push({
    instance: instance,
    job: actual.jobs[index],
    aSpawnOfTheEvilOne: fork(command, ["-job", actual.jobs[index], "--" + instance], {
      stdio: "inherit",
      detached: true,
    }),
  });
}

for (const thing of executed) {
  thing.aSpawnOfTheEvilOne.on("close", (code) => {
    const message = `close: instance: ${thing.instance}, job: ${thing.job}, code: ${code}`;
    _loggerService.debug(message);
    _discordService.sendDiscordNotification(DiscordChannel.DEBUG, message);
  });
}

// kill child processes if parent is killed
process.on("SIGINT", () => {
  _loggerService.debug("Caught SIGINT...");

  for (const thing of executed) {
    thing.aSpawnOfTheEvilOne.kill("SIGINT");
    const message = `killed by Flork:: instance: ${thing.instance}, job: ${thing.job}, killed?: ${thing.aSpawnOfTheEvilOne.killed}`;
    _loggerService.debug(message);
    _discordService.sendDiscordNotification(DiscordChannel.DEBUG, message);
  }

  process.exit();
});

process.on("beforeExit", () => {
  _loggerService.debug("Caught beforeExit...");

  for (const thing of executed) {
    thing.aSpawnOfTheEvilOne.kill("SIGINT");
    const message = `killed by Flork:: instance: ${thing.instance}, job: ${thing.job}, killed?: ${thing.aSpawnOfTheEvilOne.killed}`;
    _loggerService.debug(message);
    _discordService.sendDiscordNotification(DiscordChannel.DEBUG, message);
  }
});