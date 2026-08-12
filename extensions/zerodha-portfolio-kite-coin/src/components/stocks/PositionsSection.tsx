import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { KITE_WEB_URL } from "../../lib/constants";
import {
  formatCurrency,
  formatPnL,
  formatPercent,
  pnlIcon,
  computePnlPercent,
  getColor,
} from "../../lib/formatters";
import { Position } from "../../lib/types";

interface PositionsSectionProps {
  positions: Position[];
  isLoggedIn: boolean;
  onRefresh?: () => Promise<void>;
  onLogout?: () => Promise<void>;
}

export function PositionsSection({
  positions,
  isLoggedIn,
  onRefresh,
  onLogout,
}: PositionsSectionProps) {
  // Only show positions with non-zero quantity
  const active = positions.filter((p) => p.quantity !== 0);
  if (active.length === 0) return null;

  return (
    <List.Section title="Positions">
      {active.map((p) => {
        // `buy_price` * `buy_quantity` - `sell_price` * `sell_quantity` + `last_price` * `quantity` ?
        // Or simply `quantity * average_price` is the invested/cost if open?
        // Let's use `p.value` or calculate simply `quantity * average_price` for open positions.
        // `p.quantity` can be negative (sell).
        const quantity = Math.abs(p.quantity);
        const investedValue = quantity * p.average_price;
        const currentValue = quantity * p.last_price;
        const pnl = p.pnl;
        const pnlPercent = computePnlPercent(p.average_price, p.last_price);

        return (
          <List.Item
            key={`${p.tradingsymbol}-${p.exchange}-${p.product}`}
            icon={pnlIcon(p.pnl)}
            title={p.tradingsymbol}
            subtitle={`${quantity} qty   Inv: ${formatCurrency(investedValue)}   Curr: ${formatCurrency(currentValue)}`}
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
                <Action.OpenInBrowser
                  title="Open in Kite"
                  url={`${KITE_WEB_URL}/positions`}
                />
                <Action.CopyToClipboard
                  title="Copy Symbol"
                  content={p.tradingsymbol}
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
