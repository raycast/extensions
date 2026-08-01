import { Detail, ActionPanel, Action, Icon } from "@raycast/api";
import { useState, useEffect } from "react";
import { isWebAppInstalled, isAutoPiPInstalled, createWebApp } from "./webapp";

export default function SetupCommand() {
  const [webAppInstalled, setWebAppInstalled] = useState<boolean | null>(null);
  const [autoPiPInstalled, setAutoPiPInstalled] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    isWebAppInstalled().then(setWebAppInstalled);
    isAutoPiPInstalled().then(setAutoPiPInstalled);
  }, []);

  const webAppStatus =
    webAppInstalled === null
      ? "Checking..."
      : webAppInstalled
        ? "Installed"
        : "Not installed";
  const autoPiPStatus =
    autoPiPInstalled === null
      ? "Checking..."
      : autoPiPInstalled
        ? "Installed"
        : "Not installed";

  const markdown = `
# YouTube Setup

## Status

| Component | Status |
|-----------|--------|
| Safari Web App | ${webAppStatus} |
| AutoPiP Extension | ${autoPiPStatus} |

## Setup Steps

### 1. Create Safari Web App

1. Open Safari and go to [youtube.com](https://www.youtube.com)
2. In the menu bar, click **File → Add to Dock...**
3. Name it "YouTube" and click **Add**
4. The web app will appear in your Applications folder

### 2. (Optional) Install AutoPiP

AutoPiP automatically enables Picture-in-Picture for web videos:

1. Download [AutoPiP](https://apps.apple.com/app/autopip) from the App Store
2. Open it and enable the Safari extension
3. In Safari → Settings → Extensions, enable AutoPiP

### 3. You're Done!

Use any of the YouTube commands in Raycast:
- **Search Videos** — Search YouTube
- **Continue Watching** — Opens the web app
- **Browse Trending** — See what's popular
- **Browse History** — Quick access to recent videos
`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          {!webAppInstalled ? (
            <Action
              title="Create Web App"
              icon={Icon.Plus}
              onAction={async () => {
                await createWebApp();
                setWebAppInstalled(true);
              }}
            />
          ) : null}
          <Action.OpenInBrowser
            title="Open YouTube"
            url="https://www.youtube.com"
          />
          <Action.OpenInBrowser
            title="Get AutoPiP"
            icon={Icon.AppWindow}
            url="https://apps.apple.com/app/autopip"
          />
        </ActionPanel>
      }
    />
  );
}
