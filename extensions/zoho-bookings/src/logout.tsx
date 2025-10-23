import { Detail, ActionPanel, Action, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";
import { clearTokens, isAuthenticated } from "./oauth/zoho-provider";

interface Preferences {
  dataCenter: string;
}

export default function LogoutCommand() {
  const [isLoading, setIsLoading] = useState(true);
  const [wasAuthenticated, setWasAuthenticated] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    checkAuthAndLogout();
  }, []);

  async function checkAuthAndLogout() {
    try {
      const authenticated = await isAuthenticated();
      setWasAuthenticated(authenticated);

      if (authenticated) {
        await clearTokens();
        setLoggedOut(true);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to logout",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <Detail isLoading={true} markdown="Logging out..." />;
  }

  if (!wasAuthenticated) {
    return (
      <Detail
        markdown={`# ℹ️ Not Authenticated

You are not currently logged in to Zoho Bookings.

To get started, run the **Setup Zoho Auth** command.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Zoho Api Console"
              url={`https://api-console.zoho.${preferences.dataCenter}`}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (loggedOut) {
    return (
      <Detail
        markdown={`# ✅ Logged Out Successfully

All authentication tokens have been cleared.

To use the extension again, run the **Setup Zoho Auth** command to re-authenticate.`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Zoho Api Console"
              url={`https://api-console.zoho.${preferences.dataCenter}`}
            />
          </ActionPanel>
        }
      />
    );
  }

  return <Detail markdown="# Logout" />;
}
