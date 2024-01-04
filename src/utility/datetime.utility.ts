export const LOCALE = "sv-SE"; "yyyy-MM-dd"
export const TIME_ZONE = "America/Toronto";

export const toEST = (date: number | Date): string => {
  let localeString;
  if (typeof date === "number") {
    // tg timestamp
    localeString = (new Date(date * 1000)).toLocaleString(LOCALE, { timeZone: TIME_ZONE });
  } else {
    // Javascript date object
    localeString = date.toLocaleString(LOCALE, { timeZone: TIME_ZONE });
  }
  const split = localeString.split(" GMT");
  return split[0] + " EST";
}