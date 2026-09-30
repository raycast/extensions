import { useState } from "react";
import { ActionPanel, Action, Detail, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { DEFAULT_ERROR_TITLE, DownloadText } from "../../constants";

export function NotInstalledError() {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Detail
      actions={
        <ActionPanel>
          {!isLoading && (
            <Action
              title="Install with Homebrew"
              onAction={async () => {
                if (isLoading) return;

                setIsLoading(true);

                const toast = new Toast({ style: Toast.Style.Animated, title: "Installing..." });
                await toast.show();

                try {
                  execSync(`brew install --cask zen-browser`);
                  await toast.hide();
                } catch {
                  await toast.hide();
                  await showToast(
                    Toast.Style.Failure,
                    DEFAULT_ERROR_TITLE,
                    "An unknown error occurred while trying to install",
                  );
                }
                setIsLoading(false);
              }}
            />
          )}
        </ActionPanel>
      }
      markdown={DownloadText}
    />
  );
}
