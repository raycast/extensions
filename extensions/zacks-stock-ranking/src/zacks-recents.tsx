import { Action, ActionPanel, Color, Icon, List, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getZacksData, getZacksRankColor, formatCurrency, formatPercent } from "./api";
import { RecentTicker, ZacksQuoteData } from "./types";
import { StockDetailView } from "./components/StockDetailView";

const RECENTS_KEY = "recent-tickers";

interface RecentWithData extends RecentTicker {
  zacksData?: ZacksQuoteData | null;
  isLoading?: boolean;
}

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

function getAccessories(recent: RecentWithData): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (recent.zacksData) {
    const data = recent.zacksData;
    const change = parseFloat(data.net_change);
    const isPositive = !isNaN(change) && change >= 0;

    // Price
    accessories.push({ text: formatCurrency(data.last) });

    // Change with color
    accessories.push({
      tag: {
        value: formatPercent(data.percent_net_change),
        color: isPositive ? Color.Green : Color.Red,
      },
    });

    // Zacks Rank with recommendation text
    if (data.zacks_rank && data.zacks_rank !== "NA" && data.zacks_rank_text) {
      accessories.push({
        tag: {
          value: `Rank ${data.zacks_rank} - ${data.zacks_rank_text}`,
          color: getZacksRankColor(data.zacks_rank),
        },
      });
    }
  }

  // Time ago
  accessories.push({ text: formatTimeAgo(recent.timestamp), icon: Icon.Clock });

  return accessories;
}

export default function RecentStocks() {
  const {
    data: recentsWithData,
    isLoading,
    revalidate,
  } = useCachedPromise(async () => {
    const stored = await LocalStorage.getItem<string>(RECENTS_KEY);
    const recents: RecentTicker[] = stored ? JSON.parse(stored) : [];

    if (recents.length === 0) return [];

    // Fetch Zacks data for all recent stocks in parallel
    const recentsWithData: RecentWithData[] = await Promise.all(
      recents.map(async (recent) => {
        try {
          const zacksData = await getZacksData(recent.symbol);
          return { ...recent, zacksData };
        } catch {
          return { ...recent, zacksData: null };
        }
      }),
    );

    return recentsWithData;
  }, []);

  async function clearRecents() {
    await LocalStorage.removeItem(RECENTS_KEY);
    await showToast({ style: Toast.Style.Success, title: "Cleared recent stocks" });
    revalidate();
  }

  async function removeRecent(symbol: string) {
    const stored = await LocalStorage.getItem<string>(RECENTS_KEY);
    const current: RecentTicker[] = stored ? JSON.parse(stored) : [];
    const filtered = current.filter((r) => r.symbol !== symbol);
    await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(filtered));
    await showToast({ style: Toast.Style.Success, title: `Removed ${symbol}` });
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter recent stocks...">
      {recentsWithData && recentsWithData.length > 0 ? (
        <List.Section title="Recent Stocks" subtitle={`${recentsWithData.length} stocks`}>
          {recentsWithData.map((recent: RecentWithData) => (
            <List.Item
              key={recent.symbol}
              title={recent.symbol}
              subtitle={recent.zacksData?.name || recent.name}
              accessories={getAccessories(recent)}
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
                  <Action.OpenInBrowser
                    title="Open on Zacks.com"
                    url={`https://www.zacks.com/stock/quote/${recent.symbol}`}
                  />
                  <Action.CopyToClipboard title="Copy Ticker" content={recent.symbol} />
                  <Action
                    title="Remove from Recents"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => removeRecent(recent.symbol)}
                  />
                  <Action
                    title="Clear All Recents"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                    onAction={clearRecents}
                  />
                </ActionPanel>
              }
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
