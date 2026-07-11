import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { COIN_WEB_URL, COPY } from "../../lib/constants";
import { formatCurrencyCompact, formatShortDate } from "../../lib/formatters";
import { SIP } from "../../lib/types";

interface SIPsSectionProps {
  sips: SIP[];
  isLoggedIn: boolean;
  onRefresh?: () => Promise<void>;
  onLogout?: () => Promise<void>;
}

export function SIPsSection({
  sips,
  isLoggedIn,
  onRefresh,
  onLogout,
}: SIPsSectionProps) {
  const active = sips.filter((s) => s.status === "active");
  if (active.length === 0) return null;

  return (
    <List.Section title={COPY.SECTION_SIPS}>
      {active.map((s) => (
        <List.Item
          key={s.sip_id}
          icon={Icon.RotateAntiClockwise}
          title={s.fund}
          subtitle={`${formatCurrencyCompact(s.instalment_amount)}/mo    Next: ${formatShortDate(s.next_instalment)}`}
          accessories={[{ tag: { value: "Active", color: Color.Green } }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Coin" url={COIN_WEB_URL} />
              <Action.CopyToClipboard title="Copy Fund Name" content={s.fund} />
              {isLoggedIn && onRefresh && (
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={onRefresh}
                />
              )}
              {isLoggedIn && onLogout && (
                <Action title="Logout" icon={Icon.Logout} onAction={onLogout} />
              )}
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
