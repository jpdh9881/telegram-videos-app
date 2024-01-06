import * as log4js from "log4js";
let TG_INSTANCE_ID = "?";

const configure = (tgInstanceId: string): void => {
  TG_INSTANCE_ID = tgInstanceId;
  log4js.configure({
    appenders: {
      out: { type: "stdout" },
      all: { type: "dateFile", filename: `logs/log-${TG_INSTANCE_ID}.log`, pattern: "yyyy-MM-dd",  },
    },
    categories: {
      default: { appenders: [ "out", "all" ], level: "debug" },
      error: { appenders: [ "out", "all" ], level: "error" }
    },
  });
}

const debug = (content: string) => {
  const logger = log4js.getLogger();
  logger.level = "debug";
  logger.debug("(" + TG_INSTANCE_ID + ") " + content);
};

const error = (content: string) => {
  const logger = log4js.getLogger("error");
  logger.level = "error";
  logger.error("(" + TG_INSTANCE_ID + ") " + content);
};

const getTgInstanceId = () => {
  return TG_INSTANCE_ID;
}

export default {
  configure,
  debug,
  error,
  getTgInstanceId,
};