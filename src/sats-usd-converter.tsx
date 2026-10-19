import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  LaunchProps,
  Keyboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";

import { fetchPrices } from "./lib/prices";
import {
  formatDate,
  formatUsd,
  satsToUsd,
  usdToSats,
  btcToSats,
} from "./lib/utils";

export default function Command({
  arguments: { amount, direction },
}: LaunchProps<{ arguments: Arguments.SatsUsdConverter }>) {
  const isSatsToUsd = direction !== "usd-to-sats";
  const raw = amount.replace(/,/g, "").trim();
  const btcMatch = raw.match(/^(\d*\.?\d+)\s*btc$/i);
  const numericValue = btcMatch ? parseFloat(btcMatch[1]) : parseFloat(raw);

  if (btcMatch && !isSatsToUsd) {
    return (
      <Detail markdown="## Invalid amount\n\nPlease enter a USD amount for the **USD → Sats** direction." />
    );
  }

  if (isNaN(numericValue) || numericValue < 0) {
    return (
      <Detail markdown="## Invalid amount\n\nPlease enter a non-negative number." />
    );
  }

  if (numericValue === 0) {
    return <Detail markdown="## Enter an amount above zero to convert." />;
  }

  const {
    isLoading,
    data: prices,
    error,
  } = usePromise(fetchPrices, [], { execute: true });

  if (isLoading) {
    return <Detail isLoading markdown="## Fetching current Bitcoin price…" />;
  }

  if (error || !prices) {
    return (
      <Detail
        markdown={`## Failed to fetch price\n\n${error?.message || "Unable to retrieve Bitcoin price."}`}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser
              title="Open Mempool.space"
              url="https://mempool.space"
            />
          </ActionPanel>
        }
      />
    );
  }

  const btcPrice = prices.USD;
  let result: number;
  let fromLabel: string;
  let toLabel: string;

  if (isSatsToUsd) {
    const sats = btcMatch ? btcToSats(numericValue) : numericValue;
    result = satsToUsd(sats, btcPrice);
    fromLabel = btcMatch
      ? `${btcMatch[1]} BTC`
      : `${sats.toLocaleString()} sats`;
    toLabel = formatUsd(result);
  } else {
    result = usdToSats(numericValue, btcPrice);
    fromLabel = formatUsd(numericValue);
    toLabel = `${result.toLocaleString()} sats`;
  }

  const markdown = `
## ${fromLabel}
### = ${toLabel}

| Detail | Value |
|---|---|
| **Bitcoin Price** | ${formatUsd(btcPrice)} |
| **Price Timestamp** | ${formatDate(prices.time)} |
| **Conversion** | ${isSatsToUsd ? "Sats → USD" : "USD → Sats"} |
  `;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Result"
            content={String(result)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action.CopyToClipboard
            title="Copy Btc Price"
            content={String(btcPrice)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
          />
          <Action.CopyToClipboard
            title="Copy Formatted Result"
            content={`${fromLabel} = ${toLabel}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
          />
          <Action.OpenInBrowser
            title="Open on Mempool.space"
            url="https://mempool.space"
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}
