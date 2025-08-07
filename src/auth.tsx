import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
  Icon,
  getPreferenceValues,
  Action,
} from "@raycast/api";
import React from "react";
import { useEffect, useState } from "react";
import { getAuthToken, getSession } from "./functions/auth";
import { storeSessionKey, hasSessionKey, removeSessionKey, validateStoredSessionKey } from "./functions/storage";

const Command: React.FC = () => {
  const { apikey: API_KEY } = getPreferenceValues();
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const hasAuth = await hasSessionKey();
      if (hasAuth) {
        const isValid = await validateStoredSessionKey();
        if (isValid) {
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        } else {
          await removeSessionKey();
        }
      }

      const tokenResponse = await getAuthToken();

      if (!tokenResponse.success) {
        setError(tokenResponse.error || "Failed to get auth token");
        setIsLoading(false);
        return;
      }

      if (tokenResponse.data) {
        setToken(tokenResponse.data);
      }
      setIsLoading(false);
    }

    checkAuth();
  }, []);

  if (error) {
    return (
      <List>
        <List.Item
          title="Authentication Error"
          subtitle={error}
          actions={
            <ActionPanel>
              <OpenInBrowserAction
                title="Open Extension Preferences"
                icon={Icon.Gear}
                url="raycast://extensions/eggsy/lastfm/preferences"
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (isAuthenticated) {
    return (
      <List>
        <List.Item
          title="Already Authenticated"
          subtitle="You can now use scrobbling features!"
          icon={Icon.Checkmark}
          actions={
            <ActionPanel>
              <ActionPanel.Item
                title="Reset Authentication"
                icon={Icon.XmarkCircle}
                onAction={async () => {
                  await removeSessionKey();
                  setIsAuthenticated(false);
                  setToken(null);
                  const tokenResponse = await getAuthToken();
                  if (tokenResponse.success && tokenResponse.data) {
                    setToken(tokenResponse.data);
                  }
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  if (!token) {
    return <List isLoading={isLoading} searchBarPlaceholder="Authenticating..." />;
  }

  const authUrl = `https://www.last.fm/api/auth/?api_key=${API_KEY}&token=${token}`;

  return (
    <List searchBarPlaceholder="Authenticate with Last.fm">
      <List.Item
        title="Step 1: Open Last.fm Auth Page"
        subtitle="Authorize the app in your browser"
        icon={Icon.Link}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Last.fm Auth Page" url={authUrl} icon={Icon.Link} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Step 2: Complete Authentication"
        subtitle="Click after authorizing in the browser"
        icon={Icon.Checkmark}
        actions={
          <ActionPanel>
            <ActionPanel.Item
              title="Complete Authentication"
              icon={Icon.Checkmark}
              onAction={async () => {
                setIsLoading(true);
                const sessionResponse = await getSession(token);

                if (!sessionResponse.success) {
                  await showToast(ToastStyle.Failure, "Authentication Failed", sessionResponse.error);
                  setIsLoading(false);
                  return;
                }

                try {
                  if (sessionResponse.data) {
                    await storeSessionKey(sessionResponse.data);
                    setIsAuthenticated(true);
                  }
                  await showToast(
                    ToastStyle.Success,
                    "Authentication Successful",
                    "You can now use scrobbling features!",
                  );
                } catch (error) {
                  await showToast(ToastStyle.Failure, "Storage Error", "Failed to store authentication data");
                }
                setIsLoading(false);
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
};

export default Command;
