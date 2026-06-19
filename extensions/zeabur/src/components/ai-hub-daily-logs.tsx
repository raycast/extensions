import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { getAIHubSpendLogs } from "../utils/zeabur-graphql";
import { AIHubSpendLog } from "../type";

interface AIHubDailyLogsProps {
  date: string;
}

export default function AIHubDailyLogs({ date }: AIHubDailyLogsProps) {
  const [logs, setLogs] = useState<AIHubSpendLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchLogs() {
      setIsLoading(true);
      try {
        const startDate = `${date}T00:00:00Z`;
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        const endDate = `${nextDay.toISOString().split("T")[0]}T00:00:00Z`;

        const result = await getAIHubSpendLogs(startDate, endDate, page);
        setLogs(result.data);
        setTotalPages(result.totalPages);
        setTotal(result.total);
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch logs",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchLogs();
  }, [date, page]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  };

  return (
    <List
      navigationTitle={`Daily Logs - ${date}`}
      searchBarPlaceholder="Search logs by model or key"
      isLoading={isLoading}
    >
      <List.Section title={`Total Requests: ${total}`} subtitle={`Page ${page} of ${totalPages}`}>
        {logs.map((log, index) => (
          <List.Item
            key={`${log.timestamp}-${index}`}
            title={formatTime(log.timestamp)}
            accessories={[
              {
                tag: log.keyAlias,
                tooltip: "Key",
              },
              {
                tag: log.model,
                tooltip: "Model",
              },
              {
                tag: `${log.totalTokens}(${log.promptTokens}/${log.completionTokens})`,
                tooltip: "Tokens",
              },
              {
                tag: `$${log.cost.toFixed(6)}`,
                tooltip: "Cost",
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {page > 1 && (
                    <Action
                      title="Previous Page"
                      icon={Icon.ArrowLeft}
                      onAction={() => setPage(page - 1)}
                      shortcut={{ modifiers: ["cmd"], key: "[" }}
                    />
                  )}
                  {page < totalPages && (
                    <Action
                      title="Next Page"
                      icon={Icon.ArrowRight}
                      onAction={() => setPage(page + 1)}
                      shortcut={{ modifiers: ["cmd"], key: "]" }}
                    />
                  )}
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy Log Details"
                    content={`Model: ${log.model}\nKey: ${log.keyAlias}\nCost: $${log.cost.toFixed(6)}\nTotal Tokens: ${log.totalTokens}\nPrompt Tokens: ${log.promptTokens}\nCompletion Tokens: ${log.completionTokens}\nTime: ${log.timestamp}`}
                  />
                  <Action.OpenInBrowser title="Open AI Hub" url="https://zeabur.com/ai-hub" />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
        {logs.length === 0 && !isLoading && (
          <List.Item
            title="No logs for this day"
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open AI Hub" url="https://zeabur.com/ai-hub" />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
