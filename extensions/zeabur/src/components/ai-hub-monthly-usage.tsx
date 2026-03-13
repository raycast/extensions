import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { AIHubMonthlyUsageInfo, AIHubDailyUsage } from "../type";
import AIHubDailyLogs from "./ai-hub-daily-logs";

export default function AIHubMonthlyUsage({ monthlyUsage }: { monthlyUsage: AIHubMonthlyUsageInfo }) {
  const filteredDailyUsage = monthlyUsage.dailyUsage.filter((day: AIHubDailyUsage) => day.spend > 0).reverse();

  return (
    <List navigationTitle="Monthly Usage" searchBarPlaceholder="Search daily usage">
      <List.Section title={`Total Spend: $${monthlyUsage.totalSpend.toFixed(4)}`}>
        {filteredDailyUsage.length > 0 ? (
          filteredDailyUsage.map((day: AIHubDailyUsage) => (
            <List.Item
              key={day.date}
              title={day.date}
              icon={Icon.Calendar}
              accessories={[
                {
                  tag: `$${day.spend.toFixed(4)}`,
                  tooltip: "Daily spend",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push title="View Daily Logs" icon={Icon.List} target={<AIHubDailyLogs date={day.date} />} />
                  <Action.OpenInBrowser title="Open AI Hub" url="https://zeabur.com/ai-hub" />
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.Item
            title="No usage this month"
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
