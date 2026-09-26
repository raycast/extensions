export function unitToMinutes(val: string, unit: string): number {
  const num = parseInt(val, 10);
  const u = unit.toLowerCase();
  if (u.startsWith('m')) return num;
  if (u.startsWith('h')) return num * 60;
  if (u.startsWith('d')) return num * 1440;
  if (u.startsWith('w')) return num * 10080;
  return num;
}

export function extractReminders(query: string): { query: string; reminders: number[] } {
  const reminders: number[] = [];
  let cleanQuery = query;

  // 1. Check for "at time of event" / "on time" / "at start"
  const onTimeRegex =
    /(?:(?:with|add|set)\s+)?(?:a\s+)?(?:remind\s+me|alert\s+me|reminder|alert)\s+(?:for\s+|at\s+)?(?:the\s+)?(?:time\s+of\s+(?:the\s+)?event|event\s+start|start|on\s+time)\b/gi;
  let match: RegExpExecArray | null;
  while ((match = onTimeRegex.exec(cleanQuery)) !== null) {
    if (!reminders.includes(0)) {
      reminders.push(0);
    }
    cleanQuery = cleanQuery.replace(match[0], ' ');
  }

  // 2. Chained/combined or single: e.g. "remind me 2 hours before and 15 mins before" or "reminder 1h before, 10m before"
  const mainReminderRegex =
    /(?:(?:with|add|set)\s+)?(?:a\s+)?(?:remind\s+me|alert\s+me|reminder|alert)(?:\s+(?:for|of|about))?\s+(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)(?:\s+before(?:\s+(?:the\s+)?(?:event\s+)?start)?)?((?:\s*(?:,|and|\+)\s*(?:(?:a\s+)?(?:reminder\s+(?:for\s+)?|alert\s+(?:for\s+)?)?)?(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)(?:\s+before(?:\s+(?:the\s+)?(?:event\s+)?start)?)?)*)\b/gi;

  while ((match = mainReminderRegex.exec(cleanQuery)) !== null) {
    const fullMatch = match[0];
    const firstMins = unitToMinutes(match[1], match[2]);
    if (!reminders.includes(-firstMins)) {
      reminders.push(-firstMins);
    }
    const chained = match[3];
    if (chained) {
      const chainedRegex = /(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)/gi;
      let cMatch: RegExpExecArray | null;
      while ((cMatch = chainedRegex.exec(chained)) !== null) {
        const cMins = unitToMinutes(cMatch[1], cMatch[2]);
        if (!reminders.includes(-cMins)) {
          reminders.push(-cMins);
        }
      }
    }
    cleanQuery = cleanQuery.replace(fullMatch, ' ');
  }

  // 3. Check for "with [a] X min reminder/alert" or "X min reminder/alert"
  const prefixDurRegex =
    /(?:with\s+)?(?:a\s+)?(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)\s+(?:reminder|alert)(?:\s+before(?:\s+(?:the\s+)?(?:event\s+)?start)?)?\b/gi;
  while ((match = prefixDurRegex.exec(cleanQuery)) !== null) {
    const mins = unitToMinutes(match[1], match[2]);
    const offset = -mins;
    if (!reminders.includes(offset)) {
      reminders.push(offset);
    }
    cleanQuery = cleanQuery.replace(match[0], ' ');
  }

  // 4. Standalone "reminder/alert X min before"
  const standaloneRegex =
    /\b(?:remind|reminder|alert)\s+(\d+)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks)\s+before\b/gi;
  while ((match = standaloneRegex.exec(cleanQuery)) !== null) {
    const mins = unitToMinutes(match[1], match[2]);
    const offset = -mins;
    if (!reminders.includes(offset)) {
      reminders.push(offset);
    }
    cleanQuery = cleanQuery.replace(match[0], ' ');
  }

  // Clean up any double spaces or dangling whitespace
  cleanQuery = cleanQuery.replace(/\s{2,}/g, ' ').trim();

  return { query: cleanQuery, reminders };
}

export function formatReminderLabel(offsetMinutes: number): string {
  if (offsetMinutes === 0) return 'At start';
  const absMins = Math.abs(offsetMinutes);
  if (absMins < 60) {
    return `${absMins}m before`;
  }
  const hours = Math.floor(absMins / 60);
  const remainingMins = absMins % 60;
  if (hours < 24) {
    if (remainingMins === 0) {
      return `${hours}h before`;
    }
    return `${hours}h ${remainingMins}m before`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (remainingHours === 0) {
    return `${days}d before`;
  }
  return `${days}d ${remainingHours}h before`;
}
