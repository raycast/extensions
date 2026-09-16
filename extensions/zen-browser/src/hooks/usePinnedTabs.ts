import { usePromise } from "@raycast/utils";
import { readBridgeTabs } from "../util/bridge";

export function usePinnedTabs() {
  return usePromise(readBridgeTabs, [], { onError: () => {}, execute: process.platform === "darwin" });
}
