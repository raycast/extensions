import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { COPY } from "../lib/constants";
import { formatTimestamp } from "../lib/formatters";
import { LoginForm } from "./LoginForm";

interface LoginItemProps {
  onLoginSuccess: (enctoken: string, userId: string) => Promise<void>;
  storedUserId?: string | null;
  rememberedUserId?: string | null;
  lastSynced?: string | null;
  onLogout?: () => Promise<void>;
}

/**
 * Login prompt shown as the first list item in the expired-session state.
 */
export function LoginItem({
  onLoginSuccess,
  storedUserId,
  rememberedUserId,
  lastSynced,
  onLogout,
}: LoginItemProps) {
  return (
    <List.Item
      icon={Icon.Key}
      title={COPY.LOGIN_BANNER_TITLE}
      subtitle={COPY.LOGIN_BANNER_SUBTITLE}
      accessories={
        lastSynced
          ? [{ text: `Last synced: ${formatTimestamp(lastSynced)}` }]
          : []
      }
      actions={
        <ActionPanel>
          <Action.Push
            title={COPY.LOGIN_ACTION}
            icon={Icon.Key}
            target={
              <LoginForm
                onSuccess={onLoginSuccess}
                storedUserId={storedUserId}
                rememberedUserId={rememberedUserId}
              />
            }
          />
          {onLogout && (
            <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
          )}
        </ActionPanel>
      }
    />
  );
}
