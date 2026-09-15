import { closeMainWindow } from "@raycast/api";
import { bridgeRequest } from "../util/bridge";
import { PinnedTabEntry } from "../util/pinned-tabs";

export async function switchPinnedTab(entry: PinnedTabEntry) {
  await bridgeRequest(entry.bridge, { method: "activate", session: entry.session, tabId: entry.tabId });
  await closeMainWindow();
}
