import { Action, ActionPanel, Detail } from "@raycast/api";
import { useEffect } from "react";
import { useZacksData, getZacksRankColor, formatCurrency, formatPercent, formatNumber } from "../api";
import { addToRecents } from "../recents";
import { ZacksQuoteData } from "../types";

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

interface StockDetailViewProps {
  ticker: string;
  name?: string;
}

export function StockDetailView({ ticker, name }: StockDetailViewProps) {
  const symbol = ticker.toUpperCase().trim();

  const { data, isLoading, error } = useZacksData(symbol);

  useEffect(() => {
    if (data) {
      addToRecents(symbol, data.name || name || symbol);
    }
  }, [data, symbol, name]);

  if (error) {
    return <Detail markdown={`# Error\n\nFailed to fetch data for **${symbol}**:\n\n${error.message}`} />;
  }

  if (!data && !isLoading) {
    return (
      <Detail
        markdown={`# Not Found\n\nNo data found for ticker **${symbol}**.\n\nMake sure you entered a valid stock symbol.`}
      />
    );
  }

  const markdown = data ? generateMarkdown(data) : `# Loading ${symbol}...`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={data ? <StockMetadata data={data} /> : undefined}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open on Zacks.com" url={`https://www.zacks.com/stock/quote/${symbol}`} />
          <Action.CopyToClipboard title="Copy Ticker" content={symbol} />
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
