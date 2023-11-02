export const delay = (ms: number, log: boolean = false): Promise<void> => {
  if (log) console.debug("(waiting)");
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};