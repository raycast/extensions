import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";
import {
  isWebAppInstalled,
  isAutoPiPInstalled,
  createWebApp,
  isSafariJSEnabled,
  openSafariSettings,
} from "./webapp";

type Status =
  "checking" | "not-installed" | "installing" | "installed" | "failed";

export default function SetupCommand() {
  const [webAppStatus, setWebAppStatus] = useState<Status>("checking");
  const [autoPiPStatus, setAutoPiPStatus] = useState<Status>("checking");
  const [jsStatus, setJsStatus] = useState<Status>("checking");

  async function checkAndInstall() {
    // Check web app
    const webAppInstalled = await isWebAppInstalled();
    if (webAppInstalled) {
      setWebAppStatus("installed");
    } else {
      setWebAppStatus("installing");
      try {
        await createWebApp();
        // Poll for installation — user may take time to click "Add" in Safari dialog
        let nowInstalled = false;
        for (let i = 0; i < 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          nowInstalled = await isWebAppInstalled();
          if (nowInstalled) break;
        }
        setWebAppStatus(nowInstalled ? "installed" : "failed");
        if (nowInstalled) {
          await showToast({
            style: Toast.Style.Success,
            title: "YouTube web app installed",
          });
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Web app installation failed",
            message: "Click 'Add to Dock' in the Safari dialog, then Recheck",
          });
        }
      } catch {
        setWebAppStatus("failed");
        await showToast({
          style: Toast.Style.Failure,
          title: "Web app installation failed",
          message: "Make sure Safari is running and try again",
        });
      }
    }

    // Check Safari JS
    const jsEnabled = await isSafariJSEnabled();
    setJsStatus(jsEnabled ? "installed" : "not-installed");
    if (!jsEnabled) {
      // Auto-open Safari Settings so user can enable it
      await openSafariSettings();
    }

    // Check AutoPiP
    const autoPiPInstalled = await isAutoPiPInstalled();
    setAutoPiPStatus(autoPiPInstalled ? "installed" : "not-installed");
  }

  useEffect(() => {
    checkAndInstall();
  }, []);

  function statusIcon(status: Status): string {
    switch (status) {
      case "checking":
        return "⏳";
      case "not-installed":
        return "❌";
      case "installing":
        return "🔄";
      case "installed":
        return "✅";
      case "failed":
        return "⚠️";
    }
  }

  function statusText(status: Status): string {
    switch (status) {
      case "checking":
        return "Checking...";
      case "not-installed":
        return "Not enabled";
      case "installing":
        return "Installing...";
      case "installed":
        return "Enabled";
      case "failed":
        return "Failed — retry needed";
    }
  }

  const allReady = webAppStatus === "installed" && jsStatus === "installed";

  const markdown = `
# YouTube Setup

| Component | Status |
|-----------|--------|
| Safari Web App | ${statusIcon(webAppStatus)} ${statusText(webAppStatus)} |
| Safari JavaScript (for real history) | ${statusIcon(jsStatus)} ${statusText(jsStatus)} |
| AutoPiP Extension (optional) | ${statusIcon(autoPiPStatus)} ${statusText(autoPiPStatus)} |

${
  webAppStatus === "installing"
    ? "### Installing Web App\n\nSafari is opening and adding YouTube to your Dock. **Click 'Add'** when the dialog appears."
    : ""
}

${
  webAppStatus === "failed"
    ? "### Installation Failed\n\nClick **Retry Web App Install** below. Make sure Safari is running and click 'Add' in the dialog."
    : ""
}

${
  jsStatus === "not-installed"
    ? '### Enable Safari JavaScript\n\nSafari Settings just opened. In the **Advanced** tab:\n1. Check **"Show features for web developers"** at the bottom\n2. Check **"Allow JavaScript from Apple Events"**\n3. Close Settings\n\nThis lets the extension read your **real watch history** and **continue watching** from your authenticated YouTube session.'
    : ""
}

${
  jsStatus === "installed"
    ? "### Safari JavaScript Enabled ✅\n\nYour real YouTube watch history and continue-watching are available."
    : ""
}

${
  autoPiPStatus === "not-installed"
    ? "### Optional: AutoPiP\n\nAutoPiP enables automatic Picture-in-Picture for YouTube videos. Install it from the App Store, then enable it in Safari → Settings → Extensions."
    : ""
}

${
  allReady
    ? "### All Set! 🎉\n\nEverything is configured. Use any YT command in Raycast:\n- **Search Videos** — Search YouTube\n- **Continue Watching** — Opens your last watched video\n- **Browse Trending** — See what's popular\n- **Browse History** — Your real YouTube watch history"
    : ""
}
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {webAppStatus === "failed" || webAppStatus === "not-installed" ? (
            <Action
              title="Retry Web App Install"
              icon={Icon.ArrowClockwise}
              onAction={async () => {
                setWebAppStatus("installing");
                try {
                  await createWebApp();
                  let nowInstalled = false;
                  for (let i = 0; i < 10; i++) {
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                    nowInstalled = await isWebAppInstalled();
                    if (nowInstalled) break;
                  }
                  setWebAppStatus(nowInstalled ? "installed" : "failed");
                } catch {
                  setWebAppStatus("failed");
                }
              }}
            />
          ) : null}
          {jsStatus === "not-installed" ? (
            <Action
              title="Open Safari Settings"
              icon={Icon.Gear}
              onAction={async () => {
                await openSafariSettings();
                await showToast({
                  style: Toast.Style.Animated,
                  title: "Enable 'Allow JavaScript from Apple Events'",
                  message: "Safari → Settings → Advanced",
                });
              }}
            />
          ) : null}
          <Action
            title="Recheck Status"
            icon={Icon.ArrowClockwise}
            onAction={() => {
              setWebAppStatus("checking");
              setAutoPiPStatus("checking");
              setJsStatus("checking");
              checkAndInstall();
            }}
          />
          {autoPiPStatus === "not-installed" ? (
            <Action.OpenInBrowser
              title="Get AutoPiP from App Store"
              icon={Icon.AppWindow}
              url="https://apps.apple.com/app/autopip"
            />
          ) : null}
          <Action.OpenInBrowser
            title="Open YouTube"
            url="https://www.youtube.com"
          />
        </ActionPanel>
      }
    />
  );
}
