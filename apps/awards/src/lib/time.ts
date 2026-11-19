/** All dates are stored in UTC and shown in East Africa Time (spec §3.4/§5.2). */
export const TZ = "Africa/Addis_Ababa";

export function formatEat(date: Date | string, locale = "en-GB", opts: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short" }) {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: TZ }).format(new Date(date));
}

export type Remaining = { total: number; days: number; hours: number; minutes: number; seconds: number };

export function remaining(target: Date | string, now: number = Date.now()): Remaining {
  const total = Math.max(0, new Date(target).getTime() - now);
  const s = Math.floor(total / 1000);
  return { total, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/** "3 days", "5 hours", "12 minutes", "less than a minute". */
export function humanizeRemaining(r: Remaining): string {
  if (r.days >= 1) return `${r.days} ${r.days === 1 ? "day" : "days"}`;
  if (r.hours >= 1) return `${r.hours} ${r.hours === 1 ? "hour" : "hours"}`;
  if (r.minutes >= 1) return `${r.minutes} ${r.minutes === 1 ? "minute" : "minutes"}`;
  return "less than a minute";
}
