const LEAP_YEAR = 2000;

export type ZodiacSign = {
  name: string;
  start: { month: number; day: number };
  end: { month: number; day: number };
  icon: string;
  description: string;
};

export const ZODIAC_SIGNS: readonly ZodiacSign[] = [
  {
    name: "Aries",
    start: { month: 3, day: 21 },
    end: { month: 4, day: 19 },
    icon: "♈️",
    description:
      "Bold and pioneering, Aries charges into life like a caffeinated ram on a mission, with unbridled energy and a fearless spirit that's always yelling \"Let's go!\" for the next wild adventure.",
  },
  {
    name: "Taurus",
    start: { month: 4, day: 20 },
    end: { month: 5, day: 20 },
    icon: "♉️",
    description:
      "Steadfast and sensual, Taurus is like that cozy blanket you never want to leave, embodying reliability while hoarding life's comforts through sheer persistence and the patience of a saint waiting in line for coffee.",
  },
  {
    name: "Gemini",
    start: { month: 5, day: 21 },
    end: { month: 6, day: 20 },
    icon: "♊️",
    description:
      "Versatile and witty, Gemini juggles ideas like a circus performer on espresso, thriving on intellectual chit-chat and social butterfly vibes, adapting to change faster than a chameleon at a paint party.",
  },
  {
    name: "Cancer",
    start: { month: 6, day: 21 },
    end: { month: 7, day: 22 },
    icon: "♋️",
    description:
      "Nurturing and intuitive, Cancer builds emotional forts like a pro architect with feelings, dishing out profound empathy to protect loved ones while surfing the waves of emotions without a life jacket.",
  },
  {
    name: "Leo",
    start: { month: 7, day: 23 },
    end: { month: 8, day: 22 },
    icon: "♌️",
    description:
      "Charismatic and creative, Leo struts into the room like the sun itself decided to show up, with natural leadership and dramatic flair that demands applause while generously spotlighting everyone else's talents too.",
  },
  {
    name: "Virgo",
    start: { month: 8, day: 23 },
    end: { month: 9, day: 22 },
    icon: "♍️",
    description:
      "Analytical and meticulous, Virgo organizes chaos like a superhero with a spreadsheet cape, excelling in service and perfectionism through practical fixes and the quiet dedication of a ninja editor.",
  },
  {
    name: "Libra",
    start: { month: 9, day: 23 },
    end: { month: 10, day: 22 },
    icon: "♎️",
    description:
      "Harmonious and diplomatic, Libra balances everything like a pro tightrope walker at a peace summit, charming the socks off people with fairness and an innate sense of justice that's basically a built-in scale.",
  },
  {
    name: "Scorpio",
    start: { month: 10, day: 23 },
    end: { month: 11, day: 21 },
    icon: "♏️",
    description:
      'Intense and transformative, Scorpio dives into mysteries like a detective in a thriller novel, armed with passionate depth and resilience that uncovers hidden truths faster than you can say "plot twist."',
  },
  {
    name: "Sagittarius",
    start: { month: 11, day: 22 },
    end: { month: 12, day: 21 },
    icon: "♐️",
    description:
      "Adventurous and optimistic, Sagittarius gallops toward freedom like a philosopher on horseback, chasing wisdom through epic explorations with enthusiasm so boundless it could power a rocket.",
  },
  {
    name: "Capricorn",
    start: { month: 12, day: 22 },
    end: { month: 1, day: 19 },
    icon: "♑️",
    description:
      "Ambitious and disciplined, Capricorn climbs success mountains like a goat with a business plan, using strategic smarts and unwavering responsibility to value tradition while high-fiving achievements at the top.",
  },
  {
    name: "Aquarius",
    start: { month: 1, day: 20 },
    end: { month: 2, day: 18 },
    icon: "♒️",
    description:
      "Innovative and humanitarian, Aquarius zaps the world with progress like a mad scientist for good, championing individuality through quirky ideas and a vision so forward-thinking it's basically time travel.",
  },
  {
    name: "Pisces",
    start: { month: 2, day: 19 },
    end: { month: 3, day: 20 },
    icon: "♓️",
    description:
      "Compassionate and imaginative, Pisces swims through empathy like a fish in a dream ocean, flowing with creativity and vivid fantasies while linking up to spiritual vibes deeper than a philosophical bathtub.",
  },
];

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function toMmdd(month: number, day: number): number {
  return month * 100 + day;
}

function inRange(mmdd: number, start: number, end: number): boolean {
  if (start <= end) return mmdd >= start && mmdd <= end;
  return mmdd >= start || mmdd <= end;
}

export function getZodiacSign(month: number, day: number): ZodiacSign | null {
  const mmdd = toMmdd(month, day);
  return (
    ZODIAC_SIGNS.find((s) => inRange(mmdd, toMmdd(s.start.month, s.start.day), toMmdd(s.end.month, s.end.day))) ?? null
  );
}

function parseToMonthDay(input: string): { month: number; day: number } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const now = new Date();

  if (lower === "today") {
    return { month: now.getMonth() + 1, day: now.getDate() };
  }
  if (lower === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return { month: d.getMonth() + 1, day: d.getDate() };
  }
  if (lower === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return { month: d.getMonth() + 1, day: d.getDate() };
  }

  // Month name + day: "March 21", "March 21st", "mar 21"
  const monthNameDay = lower.match(
    /^(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\s+(\d{1,2})(?:st|nd|rd|th)?$/i,
  );
  if (monthNameDay) {
    const month = MONTH_NAMES[monthNameDay[1].toLowerCase()];
    const day = parseInt(monthNameDay[2], 10);
    if (month && day >= 1 && day <= 31) return { month, day };
  }

  // Day + month name: "21 March", "21st March"
  const dayMonthName = lower.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)$/i,
  );
  if (dayMonthName) {
    const day = parseInt(dayMonthName[1], 10);
    const month = MONTH_NAMES[dayMonthName[2].toLowerCase()];
    if (month && day >= 1 && day <= 31) return { month, day };
  }

  // Numeric: m/d, m-d, d/m, d-m (1-2 digits each). Prefer m/d when ambiguous.
  const numeric = trimmed.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-]\d{4})?$/);
  if (numeric) {
    const a = parseInt(numeric[1], 10);
    const b = parseInt(numeric[2], 10);
    if (a >= 1 && a <= 12 && b >= 1 && b <= 31) return { month: a, day: b };
    if (b >= 1 && b <= 12 && a >= 1 && a <= 31) return { month: b, day: a };
  }

  // ISO: YYYY-MM-DD
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const month = parseInt(iso[2], 10);
    const day = parseInt(iso[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) return { month, day };
  }

  return null;
}

function isValidCalendarDate(month: number, day: number): boolean {
  const d = new Date(LEAP_YEAR, month - 1, day, 12, 0, 0);
  return d.getMonth() === month - 1 && d.getDate() === day;
}

export function parseDate(input: string): Date | null {
  const parsed = parseToMonthDay(input);
  if (!parsed) return null;
  const { month, day } = parsed;
  if (!isValidCalendarDate(month, day)) return null;
  return new Date(LEAP_YEAR, month - 1, day, 12, 0, 0);
}
