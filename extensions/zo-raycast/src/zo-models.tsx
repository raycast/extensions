import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { createClients } from "./core/factory/createClients";
import { ErrorNormalizer } from "./core/errors/ErrorNormalizer";
import { UserSettings } from "./core/config/UserSettings";
import type { ZoModel } from "./types/domain";

type ModelState = {
  models: ZoModel[];
  loading: boolean;
  error?: string;
  defaultModelId?: string;
};

export default function ZoModelsCommand() {
  const [state, setState] = useState<ModelState>({
    models: [],
    loading: true,
  });

  const loadModels = useCallback(async () => {
    setState((current) => ({
      ...current,
      loading: true,
      error: undefined,
    }));

    try {
      const { apiClient } = createClients();
      const [models, defaultModelId] = await Promise.all([apiClient.listModels(), UserSettings.getDefaultModel()]);

      setState({
        models,
        loading: false,
        defaultModelId,
      });
    } catch (error) {
      const normalizedError = ErrorNormalizer.fromUnknown(error);
      setState({
        models: [],
        loading: false,
        error: normalizedError.message,
      });
    }
  }, []);

  const setDefaultModel = useCallback(async (modelId: string) => {
    await UserSettings.setDefaultModel(modelId);
    setState((current) => ({
      ...current,
      defaultModelId: modelId,
    }));

    await showToast({
      style: Toast.Style.Success,
      title: "Default model updated",
      message: modelId,
    });
  }, []);

  useEffect(() => {
    void loadModels();
  }, [loadModels]);

  return (
    <List isLoading={state.loading} searchBarPlaceholder="Search Zo models...">
      {state.error ? (
        <List.Item
          key="error"
          title="Failed to load models"
          subtitle={state.error}
          icon={{ source: Icon.XmarkCircle, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={() => void loadModels()} />
            </ActionPanel>
          }
        />
      ) : null}

      {state.models.map((model) => {
        const isDefault = model.id === state.defaultModelId;

        return (
          <List.Item
            key={model.id}
            title={model.label}
            subtitle={model.description ?? model.id}
            icon={{
              source: isDefault ? Icon.CheckCircle : Icon.Dot,
              tintColor: isDefault ? Color.Green : Color.SecondaryText,
            }}
            accessories={isDefault ? [{ text: "Default" }] : undefined}
            actions={
              <ActionPanel>
                <Action
                  title="Set as Default"
                  icon={Icon.Star}
                  onAction={() => {
                    void setDefaultModel(model.id);
                  }}
                />
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => void loadModels()} />
              </ActionPanel>
            }
          />
        );
      })}

      {!state.loading && !state.error && state.models.length === 0 ? (
        <List.EmptyView title="No models returned" description="Zo API responded without any available models." />
      ) : null}
    </List>
  );
}
