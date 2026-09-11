import { Action, ActionPanel, Clipboard, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { createClients } from "./core/factory/createClients";
import { ErrorNormalizer } from "./core/errors/ErrorNormalizer";
import { AuthManager } from "./core/auth/AuthManager";
import type { DiagnosticItem } from "./types/domain";

type DiagnosticsState = {
  loading: boolean;
  items: DiagnosticItem[];
  lastRunAt?: string;
};

const INITIAL_ITEMS: DiagnosticItem[] = [
  {
    id: "auth",
    label: "API Key",
    status: "pending",
    detail: "Waiting for validation",
  },
  {
    id: "api",
    label: "Zo API",
    status: "pending",
    detail: "Waiting for connectivity test",
  },
];

function statusIcon(status: DiagnosticItem["status"]) {
  switch (status) {
    case "ok":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "warn":
      return { source: Icon.ExclamationMark, tintColor: Color.Orange };
    case "error":
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Clock, tintColor: Color.SecondaryText };
  }
}

function replaceItem(items: DiagnosticItem[], item: DiagnosticItem): DiagnosticItem[] {
  return items.map((current) => {
    if (current.id === item.id) {
      return item;
    }

    return current;
  });
}

export default function ZoSetupCommand() {
  const [state, setState] = useState<DiagnosticsState>({
    loading: true,
    items: INITIAL_ITEMS,
  });

  const runDiagnostics = useCallback(async () => {
    setState({
      loading: true,
      items: INITIAL_ITEMS,
      lastRunAt: new Date().toISOString(),
    });

    const keyValid = AuthManager.hasValidApiKey();
    const authItem: DiagnosticItem = keyValid
      ? {
          id: "auth",
          label: "API Key",
          status: "ok",
          detail: "API key is configured.",
        }
      : {
          id: "auth",
          label: "API Key",
          status: "error",
          detail: "Set Zo API Key in extension preferences.",
        };

    setState((current) => ({
      ...current,
      items: replaceItem(current.items, authItem),
    }));

    if (!keyValid) {
      setState((current) => ({
        ...current,
        loading: false,
      }));
      return;
    }

    const { apiClient } = createClients();

    try {
      const models = await apiClient.listModels();
      setState((current) => ({
        ...current,
        items: replaceItem(current.items, {
          id: "api",
          label: "Zo API",
          status: "ok",
          detail: `Reachable. Retrieved ${models.length} model(s).`,
        }),
      }));
    } catch (error) {
      const normalizedError = ErrorNormalizer.fromUnknown(error);
      setState((current) => ({
        ...current,
        items: replaceItem(current.items, {
          id: "api",
          label: "Zo API",
          status: "error",
          detail: normalizedError.message,
        }),
      }));
    }

    setState((current) => ({
      ...current,
      loading: false,
    }));
  }, []);

  useEffect(() => {
    void runDiagnostics();
  }, [runDiagnostics]);

  return (
    <List
      isLoading={state.loading}
      actions={
        <ActionPanel>
          <Action title="Run Diagnostics Again" icon={Icon.ArrowClockwise} onAction={() => void runDiagnostics()} />
        </ActionPanel>
      }
    >
      {state.items.map((item) => (
        <List.Item
          key={item.id}
          title={item.label}
          icon={statusIcon(item.status)}
          subtitle={item.detail}
          actions={
            <ActionPanel>
              <Action title="Run Diagnostics Again" icon={Icon.ArrowClockwise} onAction={() => void runDiagnostics()} />
              <Action
                title="Copy Status"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await Clipboard.copy(`${item.label}: ${item.status} - ${item.detail}`);
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Status copied",
                    message: `${item.label}: ${item.status}`,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
      {state.lastRunAt ? (
        <List.Item
          key="last-run"
          title="Last Run"
          subtitle={new Date(state.lastRunAt).toLocaleString()}
          icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
        />
      ) : null}
    </List>
  );
}
