import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { COPY, KITE_WEB_URL } from "../../lib/constants";
import { formatCurrency, orderStatusIcon } from "../../lib/formatters";
import { Order } from "../../lib/types";

interface OrdersSectionProps {
  orders: Order[];
  isLoggedIn: boolean;
  onRefresh?: () => Promise<void>;
  onLogout?: () => Promise<void>;
}

export function OrdersSection({
  orders,
  isLoggedIn,
  onRefresh,
  onLogout,
}: OrdersSectionProps) {
  if (orders.length === 0) return null;

  return (
    <List.Section title={COPY.SECTION_ORDERS}>
      {orders.map((o) => (
        <List.Item
          key={o.order_id}
          icon={orderStatusIcon(o.status)}
          title={`${o.tradingsymbol} ${o.transaction_type}`}
          subtitle={`${o.quantity} qty    ${formatCurrency(o.average_price || o.price)}`}
          accessories={[{ text: o.status }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open in Kite"
                url={`${KITE_WEB_URL}/orders`}
              />
              <Action.CopyToClipboard
                title="Copy Symbol"
                content={o.tradingsymbol}
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
      ))}
    </List.Section>
  );
}
