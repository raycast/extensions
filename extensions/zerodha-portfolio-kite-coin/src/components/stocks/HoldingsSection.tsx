import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { COPY, KITE_WEB_URL } from "../../lib/constants";
import {
  formatCurrency,
  formatPnL,
  formatPercent,
  formatTimestamp,
  pnlIcon,
  computePnlPercent,
  getColor,
} from "../../lib/formatters";
import { Holding } from "../../lib/types";

interface HoldingsSectionProps {
  holdings: Holding[];
  lastUpdated: string | null;
  isLoggedIn: boolean;
  onRefresh?: () => Promise<void>;
  onLogout?: () => Promise<void>;
}

export function HoldingsSection({
  holdings,
  lastUpdated,
  isLoggedIn,
  onRefresh,
  onLogout,
}: HoldingsSectionProps) {
  if (holdings.length === 0) return null;

  const subtitle = lastUpdated
    ? `Last ${isLoggedIn ? "refreshed" : "updated"}: ${formatTimestamp(lastUpdated)}`
    : undefined;

  return (
    <List.Section title={COPY.SECTION_HOLDINGS} subtitle={subtitle}>
      {holdings.map((h) => {
        const invested = h.quantity * h.average_price;
        const currentValue = h.quantity * h.last_price;
        const pnl = h.pnl;
        const pnlPercent = computePnlPercent(h.average_price, h.last_price);

        return (
          <List.Item
            key={`${h.tradingsymbol}-${h.exchange}`}
            icon={pnlIcon(h.pnl)}
            title={h.tradingsymbol}
            subtitle={`${h.quantity} qty   Inv: ${formatCurrency(invested)}   Curr: ${formatCurrency(currentValue)}`}
            accessories={[
              {
                text: {
                  value: `${formatPnL(pnl)} (${formatPercent(pnlPercent)})`,
                  color: getColor(pnl),
                },
                tooltip: "P&L (Overall)",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open in Kite"
                  url={`${KITE_WEB_URL}/holdings`}
                />
                <Action.CopyToClipboard
                  title="Copy Symbol"
                  content={h.tradingsymbol}
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
                  <Action
                    title="Logout"
                    icon={Icon.Logout}
                    onAction={onLogout}
                  />
                )}
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  );
}
