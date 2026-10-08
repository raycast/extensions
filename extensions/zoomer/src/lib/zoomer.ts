import { captureException, closeMainWindow, getApplications, open, showToast, Toast } from "@raycast/api";

const ZOOMER_BUNDLE_ID = "studio.zoomer.desktop";
const ZOOMER_WEBSITE_URL = "https://zoomer.studio";
const ZOOMER_DOWNLOAD_URL = "https://zoomer.studio/downloads/latest";

const SCREENSHOT_OUTPUTS = ["default", "copy", "save", "upload"] as const;
const SETTINGS_SECTIONS = ["app", "recording", "screenshot"] as const;

export type ScreenshotOutput = (typeof SCREENSHOT_OUTPUTS)[number];
export type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

type ZoomerPath =
  | "capture-area"
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

export async function openZoomerUrl(url: string): Promise<void> {
  if (!(await zoomerIsInstalled())) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Zoomer isn’t installed",
      message: "Install the Zoomer desktop app to use this command.",
      primaryAction: {
        title: "Download Zoomer",
        onAction: () => void open(ZOOMER_DOWNLOAD_URL),
      },
    });
    return;
  }

  await closeMainWindow({ clearRootSearch: true }).catch(() => undefined);

  try {
    await open(url, ZOOMER_BUNDLE_ID);
  } catch (error: unknown) {
    captureException(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Zoomer",
      message: error instanceof Error ? error.message : undefined,
      primaryAction: {
        title: "Open Zoomer Website",
        onAction: () => void open(ZOOMER_WEBSITE_URL),
      },
    });
  }
}

async function zoomerIsInstalled(): Promise<boolean> {
  try {
    const applications = await getApplications();
    return applications.some((application) => application.bundleId === ZOOMER_BUNDLE_ID);
  } catch {
    // If the installed-app list can't be read, don't block — let open() try.
    return true;
  }
}

function isOneOf<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value);
}
