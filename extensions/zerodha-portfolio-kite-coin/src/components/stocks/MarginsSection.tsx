import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { COPY, KITE_WEB_URL } from "../../lib/constants";
import { formatCurrencyCompact, getColor } from "../../lib/formatters";
import { MarginsResponse } from "../../lib/types";

interface MarginsSectionProps {
  margins: MarginsResponse | null;
  isLoggedIn: boolean;
  onRefresh?: () => Promise<void>;
  onLogout?: () => Promise<void>;
}

export function MarginsSection({
  margins,
  isLoggedIn,
  onRefresh,
  onLogout,
}: MarginsSectionProps) {
  if (!margins) return null;

  const equity = margins.equity;
  if (!equity.enabled) return null;

  const available = equity.available.live_balance + equity.available.collateral;
  const used = equity.utilised.debits;
  const opening = equity.available.opening_balance;
  const net = equity.net;

  return (
    <List.Section title={COPY.SECTION_MARGINS}>
      <List.Item
        icon={Icon.Wallet}
        title="Funds (Equity)"
        subtitle={`Available: ${formatCurrencyCompact(available)}`}
        accessories={[
          { text: `Opening: ${formatCurrencyCompact(opening)}` },
          { text: `Used: ${formatCurrencyCompact(used)}` },
          {
            text: {
              value: `Net: ${formatCurrencyCompact(net)}`,
              color: getColor(net),
            },
          },
        ]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open in Kite"
              url={`${KITE_WEB_URL}/funds`}
            />
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
    </List.Section>
  );
}
