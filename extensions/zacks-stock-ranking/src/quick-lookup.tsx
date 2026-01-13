import { Action, ActionPanel, Detail, LaunchProps, LocalStorage } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getZacksData, getZacksRankColor, formatCurrency, formatPercent, formatNumber } from "./api";
import { RecentTicker, ZacksQuoteData } from "./types";

const RECENTS_KEY = "recent-tickers";
const MAX_RECENTS = 10;

async function addToRecents(symbol: string, name: string) {
  const stored = await LocalStorage.getItem<string>(RECENTS_KEY);
  const recents: RecentTicker[] = stored ? JSON.parse(stored) : [];
  const filtered = recents.filter((r) => r.symbol !== symbol);
  filtered.unshift({ symbol, name, timestamp: Date.now() });
  const trimmed = filtered.slice(0, MAX_RECENTS);
  await LocalStorage.setItem(RECENTS_KEY, JSON.stringify(trimmed));
}

function generateMarkdown(data: ZacksQuoteData): string {
  const change = parseFloat(data.net_change);
  const isPositive = !isNaN(change) && change >= 0;
  const changeSign = isNaN(change) ? "" : isPositive ? "+" : "";
  const changeIndicator = isNaN(change) ? "" : isPositive ? "🟢" : "🔴";

  return `# ${data.name}  \`${data.ticker}\`

## ${formatCurrency(data.last)}  ${changeIndicator} \`${changeSign}${formatCurrency(data.net_change)} (${formatPercent(data.percent_net_change)})\`

| | |
|---|---|
| **P/E Ratio** | ${formatNumber(data.SUNGARD_PE_RATIO)} |
| **EPS** | ${formatCurrency(data.SUNGARD_EPS)} |
| **Market Cap** | ${formatNumber(data.SUNGARD_MARKET_CAP)} |
| **Previous Close** | ${formatCurrency(data.previous_close)} |
| **Open** | ${formatCurrency(data.SUNGARD_OPEN)} |
| **Bid / Ask** | ${formatCurrency(data.SUNGARD_BID)} / ${formatCurrency(data.SUNGARD_ASK)} |
| **52 Week Range** | ${formatCurrency(data.SUNGARD_YRLOW)} - ${formatCurrency(data.SUNGARD_YRHIGH)} |
`;
}

function StockMetadata({ data }: { data: ZacksQuoteData }) {
  const rankColor = getZacksRankColor(data.zacks_rank);

  return (
    <Detail.Metadata>
      <Detail.Metadata.TagList title="Zacks Rank">
        <Detail.Metadata.TagList.Item text={`${data.zacks_rank} - ${data.zacks_rank_text}`} color={rankColor} />
      </Detail.Metadata.TagList>

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Dividend" text={formatCurrency(data.source?.sungard?.dividend ?? "")} />
      <Detail.Metadata.Label title="Yield" text={data.dividend_yield ? `${data.dividend_yield}%` : "N/A"} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Label title="Last Updated" text={data.updated || "N/A"} />

      <Detail.Metadata.Separator />

      <Detail.Metadata.Link
        title="View on Zacks"
        target={`https://www.zacks.com/stock/quote/${data.ticker}`}
        text="zacks.com"
      />
    </Detail.Metadata>
  );
}

interface QuickLookupArguments {
  ticker: string;
}

export default function QuickLookup(props: LaunchProps<{ arguments: QuickLookupArguments }>) {
  const ticker = props.arguments.ticker.toUpperCase().trim();

  const { data, isLoading, error } = useCachedPromise(
    async (symbol: string) => {
      const result = await getZacksData(symbol);
      if (result) {
        await addToRecents(symbol, result.name || symbol);
      }
      return result;
    },
    [ticker],
    { keepPreviousData: false },
  );

  if (error) {
    return <Detail markdown={`# Error\n\nFailed to fetch data for **${ticker}**:\n\n${error.message}`} />;
  }

  if (!data && !isLoading) {
    return (
      <Detail
        markdown={`# Not Found\n\nNo data found for ticker **${ticker}**.\n\nMake sure you entered a valid stock symbol.`}
      />
    );
  }

  const markdown = data ? generateMarkdown(data) : `# Loading ${ticker}...`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={data ? <StockMetadata data={data} /> : undefined}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on Zacks.com" url={`https://www.zacks.com/stock/quote/${ticker}`} />
          <Action.CopyToClipboard title="Copy Ticker" content={ticker} />
          {data && (
            <Action.CopyToClipboard
              title="Copy Price"
              content={formatCurrency(data.last)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
