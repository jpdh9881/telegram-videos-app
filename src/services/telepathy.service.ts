import _discordService, { DiscordChannel } from "./discord.service";
import _loggerService from "./logger.service";

const makeTelepathic = () => {
  process.on("SIGNINT", () => {
    const message = "Flork Marshall has killed me";
    _loggerService.debug(message);
    _discordService.sendDiscordNotification(DiscordChannel.DEBUG, message);
    process.exit();
  });
};

export default {
  makeTelepathic,
};