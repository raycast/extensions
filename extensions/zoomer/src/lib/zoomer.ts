import { captureException, closeMainWindow, getApplications, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const ZOOMER_BUNDLE_ID = "studio.zoomer.desktop";
const ZOOMER_WEBSITE_URL = "https://zoomer.studio";
const ZOOMER_DOWNLOAD_URL = "https://zoomer.studio/downloads/latest";
const execFileAsync = promisify(execFile);

const SCREENSHOT_OUTPUTS = ["default", "copy", "save", "upload"] as const;
const SETTINGS_SECTIONS = ["app", "recording", "screenshot"] as const;

export type ScreenshotOutput = (typeof SCREENSHOT_OUTPUTS)[number];
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

type ZoomerPath =
  | "capture-area"
  | "capture-scrolling"
  | "capture-fullscreen"
  | "capture-history"
  | "start-recording"
  | "stop-recording"
  | "open-recordings"
  | "open-screenshots"
  | "open-settings";

export function normalizeScreenshotOutput(value: string | undefined): ScreenshotOutput {
  return value !== undefined && isOneOf(SCREENSHOT_OUTPUTS, value) ? value : "default";
}

export function normalizeSettingsSection(value: string | undefined): SettingsSection {
  return value !== undefined && isOneOf(SETTINGS_SECTIONS, value) ? value : "app";
}

export function zoomerUrl(path: ZoomerPath, params: Partial<Record<"output" | "section", string>> = {}): string {
  const url = new URL(`zoomer://app/${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

interface MinimumZoomerVersion {
  commandTitle: string;
  minimumVersion: string;
}

export async function openZoomerUrl(url: string, requirement?: MinimumZoomerVersion): Promise<void> {
  const zoomer = await findZoomer();
  if (!zoomer.installed) {
    await showFailureToast("Install the Zoomer desktop app to use this command.", {
      title: "Zoomer isn’t installed",
      primaryAction: {
        title: "Download Zoomer",
        onAction: () => void open(ZOOMER_DOWNLOAD_URL),
      },
    });
    return;
  }

  if (requirement && zoomer.path && (await zoomerIsOlderThan(zoomer.path, requirement.minimumVersion))) {
    await showFailureToast(`${requirement.commandTitle} needs Zoomer ${requirement.minimumVersion} or later.`, {
      title: "Update Zoomer",
      primaryAction: {
        title: "Download Zoomer",
        onAction: () => void open(ZOOMER_DOWNLOAD_URL),
      },
    });
    return;
  }

  await closeMainWindow({ clearRootSearch: true }).catch(() => undefined);

  try {
    // Zoomer decides which commands show its main window; URL delivery must not activate it.
    await execFileAsync("/usr/bin/open", ["-g", "-b", ZOOMER_BUNDLE_ID, url]);
  } catch (error: unknown) {
    captureException(error);
    await showFailureToast(error, {
      title: "Could not open Zoomer",
      primaryAction: {
        title: "Open Zoomer Website",
        onAction: () => void open(ZOOMER_WEBSITE_URL),
      },
    });
  }
}

async function findZoomer(): Promise<{ installed: boolean; path?: string }> {
  try {
    const applications = await getApplications();
    const zoomer = applications.find((application) => application.bundleId === ZOOMER_BUNDLE_ID);
    return { installed: zoomer !== undefined, path: zoomer?.path };
  } catch {
    // If the installed-app list can't be read, don't block — let open() try.
    return { installed: true };
  }
}

// an unreadable or unparsable version never blocks the command
async function zoomerIsOlderThan(appPath: string, minimumVersion: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync("/usr/bin/plutil", [
      "-extract",
      "CFBundleShortVersionString",
      "raw",
      `${appPath}/Contents/Info.plist`,
    ]);
    return compareVersions(stdout.trim(), minimumVersion) < 0;
  } catch {
    return false;
  }
}

function compareVersions(version: string, other: string): number {
  const left = parseVersion(version);
  const right = parseVersion(other);
  if (!left || !right) {
    return 0;
  }

  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) {
      return left[index] - right[index];
    }
  }

  return 0;
}

function parseVersion(value: string): number[] | undefined {
  const parts = value.split(".").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part < 0)) {
    return undefined;
  }

  return parts;
}

function isOneOf<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value);
}
