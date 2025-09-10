export type QueryIntent = {
  locationQuery?: string;
  targetDate?: Date;
};

// Maps normalized tokens to weekday index (0=Sunday ... 6=Saturday) or relative markers
const dayTokenToWeekday: Record<string, number> = {
  // English
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,

  // Norwegian (Bokmål). We normalize diacritics, so søndag/lørdag become sondag/lordag.
  sondag: 0,
  son: 0,
  mandag: 1,
  man: 1,
  tirsdag: 2,
  tir: 2,
  onsdag: 3,
  ons: 3,
  torsdag: 4,
  tor: 4,
  fredag: 5,
  fre: 5,
  lordag: 6,
  lor: 6,
};

const nextTokens = new Set(["next", "neste"]);

// Month tokens (English + Norwegian) to month index 0-11
const monthTokenToIndex: Record<string, number> = {
  january: 0,
  jan: 0,
  januar: 0,
  february: 1,
  feb: 1,
  februar: 1,
  march: 2,
  mar: 2,
  mars: 2,
  april: 3,
  apr: 3,
  april_nb: 3, // alias just in case
  may: 4,
  mai: 4,
  june: 5,
  jun: 5,
  juni: 5,
  july: 6,
  jul: 6,
  juli: 6,
  august: 7,
  aug: 7,
  august_nb: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  oktober: 9,
  november: 10,
  nov: 10,
  november_nb: 10,
  december: 11,
  dec: 11,
  desember: 11,
};

function stripDiacritics(value: string): string {
  // Normalize and strip combining marks without relying on Unicode properties
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeToken(token: string): string {
  return stripDiacritics(token.toLowerCase());
}

function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function thisOrNextOccurrence(weekday: number, now = new Date()): Date {
  const base = startOfLocalDay(now);
  const current = base.getDay();
  const delta = (weekday - current + 7) % 7; // allow today
  const target = new Date(base);
  target.setDate(base.getDate() + delta);
  return target;
}

export function parseQueryIntent(input: string, now = new Date()): QueryIntent {
  const raw = input.trim();
  if (!raw) return {};

  const originalTokens = raw.split(/\s+/);
  const tokens = originalTokens.map((t) => normalizeToken(t));

  let sawNext = false;
  let weekday: number | undefined;
  let isToday = false;
  let isTomorrow = false;
  let dayOfMonth: number | undefined;
  let monthIndex: number | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (nextTokens.has(t)) {
      sawNext = true;
      continue;
    }
    // "i morgen" (tomorrow)
    if (t === "i" && i + 1 < tokens.length && tokens[i + 1] === "morgen") {
      isTomorrow = true;
      i++;
      continue;
    }
    if (t === "today" || t === "idag" || (t === "i" && i + 1 < tokens.length && tokens[i + 1] === "dag")) {
      isToday = true;
      if (t === "i") i++;
      continue;
    }
    if (t === "tomorrow" || t === "morgen") {
      isTomorrow = true;
      continue;
    }
    // Month names
    const mi = monthTokenToIndex[t];
    if (typeof mi === "number") {
      monthIndex = mi;
      continue;
    }
    // Day-of-month tokens like 29, 29., 1st, 2nd, 3rd, 4th
    const domMatch = t.match(/^(\d{1,2})(?:\.|st|nd|rd|th)?$/);
    if (domMatch) {
      const n = Number(domMatch[1]);
      if (Number.isFinite(n) && n >= 1 && n <= 31) {
        dayOfMonth = n;
        continue;
      }
    }
    const dw = dayTokenToWeekday[t];
    if (typeof dw === "number") {
      weekday = dw;
      continue;
    }
  }

  let targetDate: Date | undefined;
  if (isToday) {
    targetDate = startOfLocalDay(now);
  } else if (isTomorrow) {
    const tomorrowDate = startOfLocalDay(now);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    targetDate = tomorrowDate;
  } else if (typeof dayOfMonth === "number" && typeof monthIndex === "number") {
    // Specific month and day (optionally with weekday constraint)
    const baseYear = startOfLocalDay(now).getFullYear();
    const desiredWeekday = weekday;
    let candidate: Date | undefined;
    for (let yearOffset = 0; yearOffset < 5; yearOffset++) {
      const y = baseYear + yearOffset;
      const yearCandidateDate: Date = new Date(y, monthIndex, dayOfMonth);
      if (yearCandidateDate.getMonth() !== monthIndex) continue; // invalid date (e.g., Feb 30)
      if (yearCandidateDate.getTime() < startOfLocalDay(now).getTime()) continue; // past
      if (typeof desiredWeekday === "number" && yearCandidateDate.getDay() !== desiredWeekday) continue; // mismatch, try next year
      candidate = startOfLocalDay(yearCandidateDate);
      break;
    }
    targetDate = candidate;
  } else if (typeof dayOfMonth === "number" && typeof weekday === "number") {
    // Find next date >= today that matches both weekday and day-of-month
    const base = startOfLocalDay(now);
    const candidateDate: Date = new Date(base);
    for (let i = 0; i < 400; i++) {
      if (candidateDate.getDate() === dayOfMonth && candidateDate.getDay() === weekday) {
        targetDate = new Date(candidateDate);
        break;
      }
      candidateDate.setDate(candidateDate.getDate() + 1);
    }
  } else if (typeof dayOfMonth === "number") {
    // Next occurrence of this day-of-month (this month if not passed, else next month), ignore weekday
    const base = startOfLocalDay(now);
    let y = base.getFullYear();
    let m = base.getMonth();
    let candidateDate: Date = new Date(y, m, dayOfMonth);
    if (candidateDate.getMonth() !== m || candidateDate.getTime() < base.getTime()) {
      // move to next month until valid and future
      for (let i = 0; i < 24; i++) {
        m += 1;
        if (m > 11) {
          m = 0;
          y += 1;
        }
        candidateDate = new Date(y, m, dayOfMonth);
        if (candidateDate.getMonth() === m && candidateDate.getTime() >= base.getTime()) break;
      }
    }
    targetDate = startOfLocalDay(candidateDate);
  } else if (typeof weekday === "number") {
    // Distinguish between upcoming and next week explicitly
    if (sawNext) {
      const base = startOfLocalDay(now);
      const cur = base.getDay();
      let delta = (weekday - cur + 7) % 7;
      if (delta === 0) delta = 7; // at least one week ahead
      delta += 7; // force next week
      const nextWeekDate = new Date(base);
      nextWeekDate.setDate(base.getDate() + delta);
      targetDate = nextWeekDate;
    } else {
      targetDate = thisOrNextOccurrence(weekday, now);
    }
  }

  // Rebuild a location query excluding recognized day-related tokens
  const locationParts: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const original = originalTokens[i];
    if (nextTokens.has(t)) continue;
    if (t === "i" && i + 1 < tokens.length && tokens[i + 1] === "morgen") {
      i++;
      continue;
    }
    if (t === "today" || t === "idag") continue;
    if (t === "i" && i + 1 < tokens.length && tokens[i + 1] === "dag") {
      i++;
      continue;
    }
    if (t === "tomorrow" || t === "morgen") continue;
    if (monthTokenToIndex[t] !== undefined) continue;
    if (/^(\d{1,2})(?:\.|st|nd|rd|th)?$/.test(t)) continue;
    if (dayTokenToWeekday[t] !== undefined) continue;
    locationParts.push(original);
  }

  const locationQuery = locationParts.join(" ").trim() || undefined;
  return { locationQuery, targetDate };
}
