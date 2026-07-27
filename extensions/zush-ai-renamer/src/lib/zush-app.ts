import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getApplications, type Application } from "@raycast/api";

/**
 * Locating and launching the Zush macOS app. Split from `zush.ts` so the link
 * and file-kind helpers stay importable outside the Raycast runtime.
 */
const ZUSH_BUNDLE_ID = "com.lirik.zush";
const execFileAsync = promisify(execFile);

/** The installed Zush app, or undefined when it is not on this Mac. */
export async function findZushApp(): Promise<Application | undefined> {
  const applications = await getApplications();
  return applications.find((app) => app.bundleId?.toLowerCase() === ZUSH_BUNDLE_ID);
}

/** Hands the given files to the Zush app. */
export async function openInZush(paths: string[], app: Application): Promise<void> {
  await execFileAsync("open", ["-a", app.path, ...paths]);
}
