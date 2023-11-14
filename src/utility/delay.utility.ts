import { random } from "./random.utility";

export const delay = (ms: number, log: boolean = false): Promise<void> => {
  ms = random(ms - 300, ms + 300);
  if (log) console.debug("(waiting) " + ms + "ms");
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};
