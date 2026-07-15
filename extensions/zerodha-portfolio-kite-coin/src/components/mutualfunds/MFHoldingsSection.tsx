import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { COIN_WEB_URL, COPY } from "../../lib/constants";
import {
  formatPnL,
  formatPercent,
  formatTimestamp,
  pnlIcon,
  computePnlPercent,
  getColor,
} from "../../lib/formatters";
import { MFHolding } from "../../lib/types";

interface MFHoldingsSectionProps {
  holdings: MFHolding[];
  lastUpdated: string | null;
  isLoggedIn: boolean;
  onRefresh?: () => Promise<void>;
  onLogout?: () => Promise<void>;
}

export function MFHoldingsSection({
  holdings,
  lastUpdated,
  isLoggedIn,
  onRefresh,
  onLogout,
}: MFHoldingsSectionProps) {
  if (holdings.length === 0) return null;

  const subtitle = lastUpdated
    ? `Last ${isLoggedIn ? "refreshed" : "updated"}: ${formatTimestamp(lastUpdated)}`
    : undefined;

  return (
    <List.Section title={COPY.SECTION_MF_HOLDINGS} subtitle={subtitle}>
      {holdings.map((h) => {
        const invested = h.average_price * h.quantity;
        const currentValue = h.last_price * h.quantity;
        // MF P&L might be 0 from API, calculate it if so
        const pnl = h.pnl !== 0 ? h.pnl : currentValue - invested;
        const pnlPercent = computePnlPercent(h.average_price, h.last_price);

        return (
          <List.Item
            key={`${h.tradingsymbol}-${h.folio}`}
            icon={pnlIcon(pnl)}
            title={h.fund}
            subtitle={`${h.quantity.toFixed(3)} units`}
            accessories={[
              {
                text: {
                  value: `${formatPnL(pnl)} (${formatPercent(pnlPercent)})`,
                  color: getColor(pnl),
                },
                tooltip: "P&L",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Coin" url={COIN_WEB_URL} />
                <Action.CopyToClipboard
                  title="Copy Fund Name"
                  content={h.fund}
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
