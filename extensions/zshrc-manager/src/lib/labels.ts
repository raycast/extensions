/**
 * Row labelling: the shortest unambiguous identifier.
 *
 * One rule for every type of entry:
 *   label = shortest unambiguous identifier -> list row title
 *   value = the full payload               -> detail pane
 *
 * Types that carry no separate name (paths, single-token options) derive
 * their label by shortening the payload; nothing is ever invented to fill
 * the slot. Where two entries of the same type collapse to the same label,
 * both are lengthened (one path segment at a time) until they separate:
 * `/opt/homebrew/bin` and `/usr/local/bin` become `homebrew/bin` and
 * `local/bin`.
 */

/** Maximum path depth tried while separating colliding labels. */
const MAX_DISAMBIGUATION_DEPTH = 5;

/**
 * Derives the shortest identifier for a raw entry value.
 *
 * - A path identifies itself by its last segment.
 * - A command identifies itself by the program being run.
 * - Anything else identifies itself as written.
 */
export function deriveLabel(raw: string): string {
  const cleaned = raw.trim().replace(/^["']|["']$/g, "");
  if (cleaned.includes("/")) {
    const parts = cleaned.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? cleaned;
  }
  const [first] = cleaned.split(/\s+/);
  return first || cleaned;
}

/** An item the disambiguator can widen: a label plus its full identity. */
export interface Labeled {
  /** Discriminator so labels only collide within one type */
  type: string;
  /** Current (possibly ambiguous) short label */
  label: string;
}

/**
 * Second half of the labelling rule: shortest is only good enough if it
 * is unambiguous. Where two items of the same type share a label, both
 * are widened one path segment at a time (using the full identity
 * returned by `identity`) until they separate — or until the full
 * identity is reached, which is always unique enough to display.
 */
export function disambiguate<T extends Labeled>(items: T[], identity: (item: T) => string): T[] {
  const byLabel = new Map<string, T[]>();
  for (const item of items) {
    const key = `${item.type}:${item.label}`;
    byLabel.set(key, [...(byLabel.get(key) ?? []), item]);
  }

  const widenedLabels = new Map<T, string>();
  for (const group of byLabel.values()) {
    if (group.length < 2) continue;
    let separated = false;
    for (let depth = 2; depth <= MAX_DISAMBIGUATION_DEPTH; depth += 1) {
      const widened = group.map((item) => {
        const parts = identity(item)
          .trim()
          .replace(/^["']|["']$/g, "")
          .split("/")
          .filter(Boolean);
        return parts.slice(-depth).join("/");
      });
      if (new Set(widened).size === group.length) {
        group.forEach((item, index) => widenedLabels.set(item, widened[index] ?? item.label));
        separated = true;
        break;
      }
    }
    // Bounded widening can fail when paths differ only above the bound.
    // Fall back to the full identity — always unique enough to display.
    // Genuinely identical duplicates keep their short label as designed.
    if (!separated) {
      const fullIdentities = group.map((item) =>
        identity(item)
          .trim()
          .replace(/^["']|["']$/g, ""),
      );
      if (new Set(fullIdentities).size > 1) {
        group.forEach((item, index) => {
          const full = fullIdentities[index];
          if (full) widenedLabels.set(item, full);
        });
      }
    }
  }

  if (widenedLabels.size === 0) return items;
  return items.map((item) => {
    const widened = widenedLabels.get(item);
    return widened !== undefined && widened !== "" ? { ...item, label: widened } : item;
  });
}
