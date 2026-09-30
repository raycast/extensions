import { differenceInSeconds, formatISO } from "date-fns";

export const getISOTimestamp = (date = new Date()) =>
  formatISO(date, { representation: "complete", format: "extended" });

export const formatTimerRuntime = (from: Date, to: Date = new Date()) => {
  const secondsDiff = differenceInSeconds(to, from);
  const days = Math.floor(secondsDiff / (3600 * 24));
  const hours = Math.floor((secondsDiff % (3600 * 24)) / 3600);
  const minutes = Math.floor((secondsDiff % 3600) / 60);
  const seconds = secondsDiff % 60;

  const result = [];
  if (days > 0) result.push(`${days}d`);
  if (hours > 0) result.push(`${hours}h`);
  if (minutes > 0) result.push(`${minutes}m`);
  result.push(`${seconds.toString().padStart(2, "0")}s`);

  return result.join(" ");
};
