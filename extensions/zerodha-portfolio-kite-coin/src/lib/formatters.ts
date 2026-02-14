import { Color } from "@raycast/api";

/**
 * Get color based on value (positive = green, negative = red, zero = primary text)
 */
export function getColor(value: number): Color {
  if (value > 0) return Color.Green;
  if (value < 0) return Color.Red;
  return Color.PrimaryText;
}

/**
 * Format a number as Indian Rupees (₹1,25,000.00)
 */
export function formatCurrency(value: number): string {
  return "₹" + formatIndianNumber(Math.abs(value), 2);
}

/**
 * Format a number as Indian Rupees without decimals (₹1,25,000)
 */
export function formatCurrencyCompact(value: number): string {
  return "₹" + formatIndianNumber(Math.abs(value), 0);
}

/**
 * Format a P&L value with sign.
 * Returns e.g. "+₹12,500.50" or "-₹3,100.00"
 */
export function formatPnL(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}₹${formatIndianNumber(Math.abs(value), 2)}`;
}

/**
 * Format a percentage with sign.
 * Returns e.g. "+3.20%" or "-2.50%"
 */
export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

/**
 * Return a profit/loss emoji.
 */
export function pnlIcon(value: number): string {
  if (value > 0) return "📈";
  if (value < 0) return "📉";
  return "📊";
}

/**
 * Format a number with the Indian numbering system (lakhs/crores).
 */
function formatIndianNumber(num: number, decimals: number): string {
  const [intPart, decPart] = num.toFixed(decimals).split(".");
  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const formatted =
    rest.length > 0
      ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
      : lastThree;
  return decimals > 0 ? `${formatted}.${decPart}` : formatted;
}

/**
 * Format a timestamp for display.
 * If today, shows "2:30 PM". If yesterday/older, shows "Yesterday 3:42 PM" or date.
 */
export function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const timeStr = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isSameDay(date, now)) {
    return timeStr;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, yesterday)) {
    return `Yesterday ${timeStr}`;
  }

  return (
    date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }) + ` ${timeStr}`
  );
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Format a date string for SIP next instalment (e.g. "5 Mar")
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Order status icon
 */
export function orderStatusIcon(status: string): string {
  const s = status.toUpperCase();
  if (s === "COMPLETE") return "✅";
  if (s === "OPEN" || s === "TRIGGER PENDING") return "⏳";
  if (s === "CANCELLED") return "❌";
  if (s === "REJECTED") return "🚫";
  return "📋";
}

/**
 * Compute P&L percentage from cost and current value.
 */
export function computePnlPercent(avgPrice: number, lastPrice: number): number {
  if (avgPrice === 0) return 0;
  return ((lastPrice - avgPrice) / avgPrice) * 100;
}
