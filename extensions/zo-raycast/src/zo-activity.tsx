import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { ActivityStore } from "./core/activity/ActivityStore";
import { createClients } from "./core/factory/createClients";
import { ErrorNormalizer } from "./core/errors/ErrorNormalizer";
import { createId } from "./core/utils/createId";
import type { ToolExecutionRecord } from "./types/domain";

type ActivityState = {
  records: ToolExecutionRecord[];
  loading: boolean;
};

function iconForOutcome(record: ToolExecutionRecord) {
  switch (record.outcome) {
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "failed":
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    case "canceled":
      return { source: Icon.Stop, tintColor: Color.Orange };
    default:
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }
}

function subtitleForRecord(record: ToolExecutionRecord): string {
  const timestamp = new Date(record.timestampIso).toLocaleString();
  const risk = record.riskLevel === "destructive" ? "Destructive" : "Safe";
  return `${timestamp} | ${risk} | ${record.outcome}`;
}

export default function ZoActivityCommand() {
  const [state, setState] = useState<ActivityState>({
    records: [],
    loading: true,
  });

  const loadRecords = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
    }));

    const records = await ActivityStore.list(250);
    setState({
      records,
      loading: false,
    });
  }, []);

  const clearRecords = useCallback(async () => {
    await ActivityStore.clear();
    await loadRecords();
    await showToast({
      style: Toast.Style.Success,
      title: "Activity cleared",
    });
  }, [loadRecords]);

  const replayRecord = useCallback(
    async (record: ToolExecutionRecord) => {
      try {
        if (record.target === "zo-api" && record.toolName === "zo.chat") {
          const model = typeof record.parameters.model === "string" ? record.parameters.model : undefined;
          const prompt = typeof record.parameters.prompt === "string" ? record.parameters.prompt : undefined;
          if (!model || !prompt) {
            throw new Error("Replay requires stored model and prompt values.");
          }

          const stream = record.parameters.stream === true;
          const { apiClient } = createClients();
          if (stream) {
            await apiClient.chatStream(
              {
                model,
                messages: [{ role: "user", content: prompt }],
              },
              () => {
                // Activity replay keeps output lightweight and surfaces completion via toast/log.
              },
            );
          } else {
            await apiClient.chat({
              model,
              messages: [{ role: "user", content: prompt }],
            });
          }

          await ActivityStore.append({
            id: createId(),
            toolName: record.toolName,
            target: record.target,
            riskLevel: "safe",
            timestampIso: new Date().toISOString(),
            parameters: record.parameters,
            outcome: "success",
          });

          await showToast({
            style: Toast.Style.Success,
            title: "Replay complete",
            message: `${record.toolName} via ${record.target}`,
          });
          await loadRecords();
          return;
        }

        throw new Error("Replay is not supported for this activity entry.");
      } catch (error) {
        const normalizedError = ErrorNormalizer.fromUnknown(error);
        await showToast({
          style: Toast.Style.Failure,
          title: normalizedError.title,
          message: normalizedError.message,
        });
      }
    },
    [loadRecords],
  );

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  return (
    <List isLoading={state.loading} searchBarPlaceholder="Search tool activity...">
      {state.records.map((record) => (
        <List.Item
          key={record.id}
          title={record.toolName}
          subtitle={subtitleForRecord(record)}
          icon={iconForOutcome(record)}
          accessories={record.errorMessage ? [{ icon: Icon.ExclamationMark, text: "Error" }] : undefined}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Parameters" content={JSON.stringify(record.parameters, null, 2)} />
              <Action.CopyToClipboard
                title="Copy Record"
                content={JSON.stringify(record, null, 2)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadRecords()} />
              <Action
                title="Replay"
                icon={Icon.Play}
                onAction={() => void replayRecord(record)}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
              <Action
                title="Clear Activity"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void clearRecords()}
              />
            </ActionPanel>
          }
        />
      ))}

      {!state.loading && state.records.length === 0 ? (
        <List.EmptyView title="No activity yet" description="Run Zo Chat actions to populate history." />
      ) : null}
    </List>
  );
}
