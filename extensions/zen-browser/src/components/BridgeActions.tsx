import { Action, environment, Icon, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const exec = promisify(execFile);

export function BridgeActions({ refresh }: { refresh: () => void }) {
  if (process.platform !== "darwin") return null;

  async function configure(action: "install" | "remove") {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Configuring Zen Connection" });
    try {
      await exec(
        process.execPath,
        [path.join(environment.assetsPath, "bridge/setup.cjs"), action, environment.supportPath],
        {
          timeout: 15000,
        },
      );
      toast.style = Toast.Style.Success;
      toast.title = action === "install" ? "Connection Configured" : "Connection Removed";
      toast.message =
        action === "install"
          ? "Install the Zen add-on if needed, then restart Zen and refresh the list."
          : "Restart Zen to finish disconnecting.";
      refresh();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could Not Configure Connection";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }

  return (
    <>
      <Action title="Set up or Repair Zen Connection" icon={Icon.Plug} onAction={() => configure("install")} />
      <Action.OpenInBrowser
        title="Install Zen Browser Add-On"
        url="https://addons.mozilla.org/firefox/addon/zen-browser-bridge/"
      />
      <Action title="Refresh Pinned Tabs" icon={Icon.ArrowClockwise} onAction={refresh} />
      <Action
        title="Remove Zen Connection"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={() => configure("remove")}
      />
    </>
  );
}
