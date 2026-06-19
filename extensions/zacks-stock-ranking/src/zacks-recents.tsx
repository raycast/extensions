import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useZacksData, getZacksRankColor, formatCurrency, formatPercent } from "./api";
import { getRecents, removeRecent, clearRecents } from "./recents";
import { RecentTicker, ZacksQuoteData } from "./types";
import { StockDetailView } from "./components/StockDetailView";

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getAccessories(data: ZacksQuoteData | null | undefined, timestamp: number): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (data) {
    const change = parseFloat(data.net_change);
    const isPositive = !isNaN(change) && change >= 0;

    accessories.push({ text: formatCurrency(data.last) });

    accessories.push({
      tag: {
        value: formatPercent(data.percent_net_change),
        color: isPositive ? Color.Green : Color.Red,
      },
    });

    if (data.zacks_rank && data.zacks_rank !== "NA" && data.zacks_rank_text) {
      accessories.push({
        tag: {
          value: `Rank ${data.zacks_rank} - ${data.zacks_rank_text}`,
          color: getZacksRankColor(data.zacks_rank),
        },
      });
    }
  }

  accessories.push({ text: formatTimeAgo(timestamp), icon: Icon.Clock });

  return accessories;
}

interface RecentStockItemProps {
  recent: RecentTicker;
  onRemove: (symbol: string) => void;
  onClearAll: () => void;
}

function RecentStockItem({ recent, onRemove, onClearAll }: RecentStockItemProps) {
  const { data } = useZacksData(recent.symbol);

  return (
    <List.Item
      key={recent.symbol}
      title={recent.symbol}
      subtitle={data?.name || recent.name}
      accessories={getAccessories(data, recent.timestamp)}
      icon={{
        source: `https://assets.parqet.com/logos/symbol/${recent.symbol}`,
        fallback: Icon.Building,
      }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Stock Details"
            icon={Icon.Eye}
            target={<StockDetailView ticker={recent.symbol} name={recent.name} />}
          />
          <Action.OpenInBrowser title="Open on Zacks.com" url={`https://www.zacks.com/stock/quote/${recent.symbol}`} />
          <Action.CopyToClipboard title="Copy Ticker" content={recent.symbol} />
          <Action
            title="Remove from Recents"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
            onAction={() => onRemove(recent.symbol)}
          />
          <Action
            title="Clear All Recents"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
            onAction={onClearAll}
          />
        </ActionPanel>
      }
    />
  );
}

export default function RecentStocks() {
  const { data: recents, isLoading, revalidate } = useCachedPromise(getRecents, []);

  async function handleClearRecents() {
    await clearRecents();
    await showToast({ style: Toast.Style.Success, title: "Cleared recent stocks" });
    revalidate();
  }

  async function handleRemoveRecent(symbol: string) {
    await removeRecent(symbol);
    await showToast({ style: Toast.Style.Success, title: `Removed ${symbol}` });
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter recent stocks...">
      {recents && recents.length > 0 ? (
        <List.Section title="Recent Stocks" subtitle={`${recents.length} stocks`}>
          {recents.map((recent: RecentTicker) => (
            <RecentStockItem
              key={recent.symbol}
              recent={recent}
              onRemove={handleRemoveRecent}
              onClearAll={handleClearRecents}
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          title="No Recent Stocks"
          description="Search for stocks to add them to your recents"
          icon={Icon.Clock}
        />
      )}
    </List>
  );
}
