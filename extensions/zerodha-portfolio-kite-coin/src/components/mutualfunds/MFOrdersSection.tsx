import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { COIN_WEB_URL, COPY } from "../../lib/constants";
import { formatCurrencyCompact, orderStatusIcon } from "../../lib/formatters";
import { MFOrder } from "../../lib/types";

interface MFOrdersSectionProps {
  orders: MFOrder[];
  isLoggedIn: boolean;
  onRefresh?: () => Promise<void>;
  onLogout?: () => Promise<void>;
}

export function MFOrdersSection({
  orders,
  isLoggedIn,
  onRefresh,
  onLogout,
}: MFOrdersSectionProps) {
  if (orders.length === 0) return null;

  return (
    <List.Section title={COPY.SECTION_MF_ORDERS}>
      {orders.map((o) => {
        let statusColor = Color.PrimaryText;
        if (o.status === "COMPLETE") statusColor = Color.Green;
        else if (o.status === "REJECTED" || o.status === "CANCELLED")
          statusColor = Color.Red;
        else if (o.status === "OPEN" || o.status.includes("PENDING"))
          statusColor = Color.Yellow;

        return (
          <List.Item
            key={o.order_id}
            icon={orderStatusIcon(o.status)}
            title={`${o.fund} ${o.transaction_type}`}
            subtitle={formatCurrencyCompact(o.amount)}
            accessories={[{ tag: { value: o.status, color: statusColor } }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Coin" url={COIN_WEB_URL} />
                <Action.CopyToClipboard
                  title="Copy Fund Name"
                  content={o.fund}
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
