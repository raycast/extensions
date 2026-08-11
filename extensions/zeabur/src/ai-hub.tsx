import { useState, useEffect } from "react";
import { List, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AIHubTenantInfo, AIHubMonthlyUsageInfo, AIHubKey } from "./type";
import { getAIHubTenant, getAIHubMonthlyUsage } from "./utils/zeabur-graphql";
import ZeaburTokenUndefined from "./components/zeabur-token-undefined";
import AIHubMonthlyUsage from "./components/ai-hub-monthly-usage";

export default function Command() {
  const preferences = getPreferenceValues();
  const zeaburToken = preferences.zeaburToken;

  const [isLoading, setIsLoading] = useState(true);
  const [tenant, setTenant] = useState<AIHubTenantInfo | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState<AIHubMonthlyUsageInfo | null>(null);
  const [isReloading, setIsReloading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tenantData, usageData] = await Promise.all([getAIHubTenant(), getAIHubMonthlyUsage()]);
        setTenant(tenantData);
        setMonthlyUsage(usageData);
        setIsLoading(false);
      } catch {
        showFailureToast("Failed to fetch AI Hub data");
        setIsLoading(false);
      }
    };

    if (zeaburToken !== undefined && zeaburToken !== "") {
      fetchData();
    }
  }, [isReloading, zeaburToken]);

  if (zeaburToken === undefined || zeaburToken === "") {
    return <ZeaburTokenUndefined />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search AI Hub">
      {tenant && (
        <>
          <List.Section title="Balance">
            <List.Item
              title="Current Balance"
              icon={Icon.Wallet}
              accessories={[
                {
                  tag: `$${(tenant.balance / 100000).toFixed(3)}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title="Open AI Hub" url="https://zeabur.com/ai-hub" />
                  <Action
                    title="Reload Data"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => {
                      setIsReloading(!isReloading);
                      setIsLoading(true);
                    }}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          {tenant.keys.length > 0 && (
            <List.Section title="API Keys">
              {tenant.keys.map((key: AIHubKey) => (
                <List.Item
                  key={key.keyID}
                  title={key.alias || key.keyID}
                  subtitle={key.keyID !== key.alias ? key.keyID : undefined}
                  icon={Icon.Key}
                  accessories={[
                    {
                      tag: `Cost: $${key.cost.toFixed(4)}`,
                      tooltip: "Total cost for this key",
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open AI Hub" url="https://zeabur.com/ai-hub" />
                      <Action.CopyToClipboard title="Copy Key ID" content={key.keyID} />
                      <Action
                        title="Reload Data"
                        icon={Icon.ArrowClockwise}
                        shortcut={{ modifiers: ["cmd"], key: "r" }}
                        onAction={() => {
                          setIsReloading(!isReloading);
                          setIsLoading(true);
                        }}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          )}

          {monthlyUsage && (
            <List.Section title="Usage">
              <List.Item
                title="Monthly Usage"
                icon={Icon.BarChart}
                accessories={[
                  {
                    tag: `$${monthlyUsage.totalSpend.toFixed(4)}`,
                    tooltip: "Total monthly spend",
                  },
                  {
                    icon: Icon.ChevronRight,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Monthly Usage"
                      icon={Icon.BarChart}
                      target={<AIHubMonthlyUsage monthlyUsage={monthlyUsage} />}
                    />
                    <Action.OpenInBrowser title="Open AI Hub" url="https://zeabur.com/ai-hub" />
                    <Action
                      title="Reload Data"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={() => {
                        setIsReloading(!isReloading);
                        setIsLoading(true);
                      }}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}

      {!isLoading && !tenant && (
        <List.EmptyView
          title="No AI Hub data found"
          description="Make sure you have an AI Hub account set up"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open AI Hub" url="https://zeabur.com/ai-hub" />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
