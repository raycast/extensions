import { Action, ActionPanel, Detail, Icon, Keyboard, environment } from "@raycast/api";
import { useMemo, useState } from "react";
import { DEFAULT_PERIOD, PERIODS } from "../shared/periods";
import { useWalletChart } from "../shared/useWalletChart";
import { useWalletPortfolio } from "../shared/useWalletPortfolio";
import { formatUsd, getChartChange, renderPerformanceCard, type Change } from "../shared/performanceChart";
import { middleTruncate } from "../shared/utils";
import { ApiErrorGate } from "./ApiKeyGate";

export function PerformanceView({ address, name }: { address: string; name?: string | null }) {
  const [periodIndex, setPeriodIndex] = useState(PERIODS.indexOf(DEFAULT_PERIOD));
  const period = PERIODS[periodIndex];
  const { portfolio, isLoading: portfolioIsLoading, error: portfolioError } = useWalletPortfolio({ address });
  const { chart, isLoading: chartIsLoading, error: chartError } = useWalletChart({ address, period });

  // 1D matches the 24h change on the wallet line; other Periods come from the chart
  const change = useMemo<Change | null>(() => {
    if (period.id === "1d" && portfolio) {
      return { absolute: portfolio.change24h.absolute, relative: portfolio.change24h.relative };
    }
    return chart ? getChartChange(chart.points) : null;
  }, [period, portfolio, chart]);

  const markdown = useMemo(() => {
    if (!portfolio && !chart) {
      return "";
    }
    const image = renderPerformanceCard({
      theme: environment.appearance,
      totalValue: portfolio?.totalValue,
      change,
      period,
      points: chart?.points,
    });
    return `![Performance](${image})`;
  }, [portfolio, chart, change, period]);

  const errorGate = ApiErrorGate({ error: portfolioError || chartError });
  if (errorGate) {
    return errorGate;
  }

  return (
    <Detail
      navigationTitle={`${name || middleTruncate({ value: address, leadingLettersCount: 5 })} · Performance`}
      isLoading={portfolioIsLoading || chartIsLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Period">
            <Action
              title="Next Period"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["cmd"], key: "]" }}
              onAction={() => setPeriodIndex((index) => (index + 1) % PERIODS.length)}
            />
            <Action
              title="Previous Period"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["cmd"], key: "[" }}
              onAction={() => setPeriodIndex((index) => (index - 1 + PERIODS.length) % PERIODS.length)}
            />
            {PERIODS.map((item, index) => (
              <Action
                key={item.id}
                title={`Show ${item.label}`}
                icon={item.id === period.id ? Icon.CheckCircle : Icon.Circle}
                shortcut={{ modifiers: ["cmd"], key: String(index + 1) as Keyboard.KeyEquivalent }}
                onAction={() => setPeriodIndex(index)}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            {portfolio ? (
              <Action.CopyToClipboard
                title="Copy Total Value"
                content={formatUsd(portfolio.totalValue)}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
            ) : null}
            <Action.OpenInBrowser
              url={`https://app.zerion.io/${address}`}
              title="Open in Zerion Web App"
              icon={Icon.Globe}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
