import { random } from "./random.utility";
import _loggerService from "../services/logger.service";

export const delay = (ms: number, log: boolean = false): Promise<void> => {
  ms = random(ms - 1000, ms + 1000);
  if (log) _loggerService.debug("(waiting) " + ms + "ms");
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
