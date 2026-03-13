import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { useLogin } from "../lib/useLogin";
import { ReactElement } from "react";

export const Authenticated = ({ children }: { children: ReactElement }) => {
  const { error } = useLogin();

  if (error) {
    return (
      <Detail
        markdown={`
# ‼️ Failed to connect to Zeitraum server
\`\`\`
${error}
\`\`\`
---
> Please check your credentials in the extension preferences, make sure the Zeitraum server is running and re-run this command.
`}
        actions={
          <ActionPanel>
            <Action title="Open Preferences" onAction={openExtensionPreferences} icon={Icon.Cog} />
          </ActionPanel>
        }
      />
    );
  }

  return children;
};
