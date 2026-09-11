/**
 * Unique Zed window-title matching.
 *
 * Entry titles are basename-derived, and Zed window titles are typically
 * `{filename} — {project}` (the separator is configurable). A first-hit
 * substring match can therefore raise the wrong window (two folders named
 * "foo", or "web" vs "website") and suppress the CLI fallback. These helpers
 * only accept an exact title or a separator-bounded title, and only when that
 * match is unique. Project names that themselves contain ` - ` are kept intact.
 */

const TITLE_SEPARATORS = [" — ", " – ", " - ", " | "] as const;

function normalizeSegment(segment: string): string {
  return segment.replace(/[↗↙]+/g, "").trim();
}

function isUnambiguousSeparator(separator: (typeof TITLE_SEPARATORS)[number]): boolean {
  return separator !== " - ";
}

/**
 * The other half of a `{file} - {project}` title. ` - ` also appears inside
 * folder names, so a short title like `project` must not match `my - project`.
 */
function looksLikeCompositeSide(side: string): boolean {
  const value = normalizeSegment(side);
  if (!value) {
    return false;
  }
  if (/\.[A-Za-z0-9]{1,16}$/.test(value)) {
    return true;
  }
  if (value.includes("/") || value.includes("\\")) {
    return true;
  }
  return /^(untitled|welcome)$/i.test(value);
}

function windowTitleHasProjectTitle(
  windowTitle: string,
  projectTitle: string,
  separator: (typeof TITLE_SEPARATORS)[number],
): boolean {
  if (windowTitle.endsWith(separator + projectTitle)) {
    const prefix = windowTitle.slice(0, windowTitle.length - separator.length - projectTitle.length);
    return isUnambiguousSeparator(separator) || looksLikeCompositeSide(prefix);
  }
  if (windowTitle.startsWith(projectTitle + separator)) {
    const suffix = windowTitle.slice(projectTitle.length + separator.length);
    return isUnambiguousSeparator(separator) || looksLikeCompositeSide(suffix);
  }
  return false;
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

  return TITLE_SEPARATORS.some((separator) => windowTitleHasProjectTitle(name, title, separator));
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
