import { showToast, Toast } from "@raycast/api";
import { ensureWisprFlowInstalled, openWisprFlow } from "./db";

export default async function main() {
  if (!(await ensureWisprFlowInstalled())) return;
  const opened = await openWisprFlow("wispr-flow://stop-hands-free");
  if (!opened) return;
  await showToast({ style: Toast.Style.Success, title: "Recording stopped" });
}
