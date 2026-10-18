process.noDeprecation = true;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Detail, ActionPanel, Action, Icon } = require("@raycast/api");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { usePromise } = require("@raycast/utils");

import { fetchPrices } from "./lib/prices";
import { formatDate, formatUsd, satsToUsd, usdToSats } from "./lib/utils";

export default function Command({
  arguments: { amount, direction },
}: {
  arguments: { amount: string; direction?: string };
}) {
  const isSatsToUsd = direction !== "usd-to-sats";
  const raw = amount.replace(/,/g, "").trim();
  const parsedAmount = parseFloat(raw);

  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return (
      <Detail markdown="## Invalid amount\n\nPlease enter a non-negative number." />
    );
  }

  if (parsedAmount === 0) {
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
    result = satsToUsd(parsedAmount, btcPrice);
    fromLabel = `${parsedAmount.toLocaleString()} sats`;
    toLabel = formatUsd(result);
  } else {
    result = usdToSats(parsedAmount, btcPrice);
    fromLabel = formatUsd(parsedAmount);
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
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
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
