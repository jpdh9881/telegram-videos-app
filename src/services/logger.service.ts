import * as log4js from "log4js";
log4js.configure({
  appenders: {
    out: { type: "stdout" },
    all: { type: "dateFile", filename: "application.log" },
  },
  categories: {
    default: { appenders: [ "out", "all" ], level: "debug" },
    error: { appenders: [ "out", "all" ], level: "error" }
  },
});

const debug = (content: string) => {
  const logger = log4js.getLogger();
  logger.level = "debug";
  logger.debug(content);
};

const error = (content: string) => {
  const logger = log4js.getLogger("error");
  logger.level = "error";
  logger.error(content);
};

export default {
  debug,
  error,
};