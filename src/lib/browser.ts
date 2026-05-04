import { BrowserExtension, environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export type ActiveTab = {
  url: string;
  title: string;
  source: "browser-extension" | "applescript";
};

export class NoActiveTabError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NoActiveTabError";
  }
}

async function fromBrowserExtension(): Promise<ActiveTab | null> {
  if (!environment.canAccess(BrowserExtension)) return null;
  try {
    const tabs = await BrowserExtension.getTabs();
    const active = tabs.find((t) => t.active) ?? tabs[0];
    if (!active?.url) return null;
    return {
      url: active.url,
      title: active.title?.trim() || active.url,
      source: "browser-extension",
    };
  } catch {
    // Browser Extension API is exposed but no browser is actually connected.
    // Fall through to the AppleScript path.
    return null;
  }
}

const APPLESCRIPT_TARGETS: { app: string; chromium: boolean }[] = [
  { app: "Arc", chromium: true },
  { app: "Google Chrome", chromium: true },
  { app: "Brave Browser", chromium: true },
  { app: "Microsoft Edge", chromium: true },
  { app: "Safari", chromium: false },
];

function buildAppleScript(app: string, chromium: boolean): string {
  const tabRef = chromium ? `active tab of front window` : `current tab of front window`;
  const titleProp = chromium ? "title" : "name";
  return `
tell application "${app}"
  if not running then error "not running"
  if (count of windows) is 0 then error "no windows"
  set theURL to URL of ${tabRef}
  set theTitle to ${titleProp} of ${tabRef}
end tell
return theURL & linefeed & theTitle
`.trim();
}

async function fromAppleScript(): Promise<ActiveTab | null> {
  for (const { app, chromium } of APPLESCRIPT_TARGETS) {
    try {
      const out = await runAppleScript(buildAppleScript(app, chromium));
      const [url, ...titleParts] = out.split("\n");
      if (!url) continue;
      const title = titleParts.join("\n").trim() || url;
      return { url: url.trim(), title, source: "applescript" };
    } catch {
      // try next browser
    }
  }
  return null;
}

export async function getActiveTab(): Promise<ActiveTab> {
  const viaExt = await fromBrowserExtension();
  if (viaExt) return viaExt;
  const viaScript = await fromAppleScript();
  if (viaScript) return viaScript;
  throw new NoActiveTabError(
    "No active browser tab found. Install the Raycast Browser Extension or open a window in Arc / Chrome / Brave / Edge / Safari.",
  );
}
