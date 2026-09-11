/**
 * Unique Zed window-title matching.
 *
 * Entry titles are basename-derived, and Zed window titles are typically
 * `{filename} — {project}` (the separator is configurable). A first-hit
 * substring match can therefore raise the wrong window (two folders named
 * "foo", or "web" vs "website") and suppress the CLI fallback. These helpers
 * only accept an exact title or an exact title segment, and only when that
 * match is unique.
 */

const TITLE_SEPARATORS = / — | – | - |\s+\|\s+/;

function normalizeSegment(segment: string): string {
  return segment.replace(/[↗↙]+/g, "").trim();
}

function isPathBoundary(char: string | undefined): boolean {
  if (char === undefined) {
    return true;
  }
  return char === "/" || char === "\\" || /\s/.test(char) || char === "—" || char === "–";
}

/**
 * True when `windowTitle` contains `projectPath` as a complete path prefix,
 * not as a substring of a longer path segment (`/foo` must not match `/foo-bar`).
 */
export function windowTitleContainsProjectPath(windowTitle: string, projectPath: string): boolean {
  if (!projectPath) {
    return false;
  }

  const index = windowTitle.indexOf(projectPath);
  if (index === -1) {
    return false;
  }

  return isPathBoundary(windowTitle[index + projectPath.length]);
}

/**
 * True when the window title is the project title, or the project title is an
 * exact segment of a Zed-style composite title. Never a raw substring.
 */
export function windowTitleMatchesProject(windowTitle: string, projectTitle: string): boolean {
  const title = projectTitle.trim();
  const name = normalizeSegment(windowTitle);
  if (!title || !name) {
    return false;
  }
  if (name === title) {
    return true;
  }

  const segments = name.split(TITLE_SEPARATORS).map(normalizeSegment).filter(Boolean);
  return segments.includes(title);
}

/**
 * The exact window title to target, or null when there is no match or more
 * than one match (ambiguous — caller should fall back to the CLI).
 *
 * A unique path match wins when `projectPath` is present in a title, because
 * that is more specific than a basename. Multiple path hits are still ambiguous.
 */
export function findUniqueMatchingWindowTitle(
  windowTitles: string[],
  projectTitle: string,
  projectPath?: string,
): string | null {
  if (projectPath) {
    const pathMatches = windowTitles.filter((name) => windowTitleContainsProjectPath(name, projectPath));
    if (pathMatches.length === 1) {
      return pathMatches[0];
    }
    if (pathMatches.length > 1) {
      return null;
    }
  }

  const titleMatches = windowTitles.filter((name) => windowTitleMatchesProject(name, projectTitle));
  return titleMatches.length === 1 ? titleMatches[0] : null;
}

/** True when more than one currently-open project uses this list title. */
export function isAmbiguousProjectTitle(openTitles: string[], projectTitle: string): boolean {
  return openTitles.filter((title) => title === projectTitle).length > 1;
}
