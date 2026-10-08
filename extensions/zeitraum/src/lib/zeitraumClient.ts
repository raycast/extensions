import { Alert, Icon, Toast, confirmAlert, getPreferenceValues, popToRoot, showHUD, showToast } from "@raycast/api";
import { Preset, zeitraum } from "@zeitraum/client";
import { getISOTimestamp } from "./dateUtils";
import { TimeSpanEditFormValues } from "../components/timeSpan/timeSpanEditForm";
import { PresetEditFormValues } from "../components/preset/presetEditForm";
import { TagEditFormValues } from "../components/tag/tagEditForm";

const { url: baseUrl, apiToken, stopPreviousRunning } = getPreferenceValues();
export const client = zeitraum({
  baseUrl,
  apiToken,
});

export const confirmPresetDeletion = (id: string) =>
  confirmAlert({
    icon: Icon.Trash,
    title: "Delete preset?",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        await client.deletePreset({
          id,
        });
        showHUD("Preset deleted");
        popToRoot();
      },
    },
  });

export const createTag = async (values: TagEditFormValues) => {
  try {
    await client.createTag({
      input: {
        name: values.name,
      },
    });
    showHUD("Tag created");
    popToRoot();
  } catch (e: unknown) {
    let errorMessage = String(e);
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    showToast({ style: Toast.Style.Failure, title: "Failed to create tag", message: errorMessage });
  }
};

export const createPreset = async (values: PresetEditFormValues) => {
  try {
    await client.createPreset({
      input: {
        name: values.name,
        tags: values.tags,
        note: values.note && values.note.length > 0 ? values.note : null,
      },
    });
    showHUD("Preset created");
    popToRoot();
  } catch (e: unknown) {
    let errorMessage = String(e);
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    showToast({ style: Toast.Style.Failure, title: "Failed to create preset", message: errorMessage });
  }
};

export const updatePreset = async (preset: Preset, values: PresetEditFormValues) => {
  try {
    await client.updatePreset({
      id: preset.id,
      input: {
        sortIndex: preset.sortIndex,
        name: values.name,
        tags: values.tags,
        note: values.note && values.note.length > 0 ? values.note : undefined,
      },
    });
    showHUD("Changes saved");
    popToRoot();
  } catch (e: unknown) {
    let errorMessage = String(e);
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    showToast({ style: Toast.Style.Failure, title: "Failed to update preset", message: errorMessage });
  }
};

export const confirmTimeSpanDeletion = (id: string) =>
  confirmAlert({
    icon: Icon.Trash,
    title: "Delete time span?",
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
      onAction: async () => {
        await client.deleteTimeSpan({
          id,
        });
        showHUD("Time span deleted");
        popToRoot();
      },
    },
  });

export const stopTimer = async (id: string) => {
  try {
    await client.closeTimeSpan({
      id,
    });
    showHUD("Timer stopped");
    popToRoot();
  } catch (e: unknown) {
    let errorMessage = String(e);
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    showToast(Toast.Style.Failure, `Failed to stop timer: ${errorMessage}`);
  }
};

export const createTimeSpanFromPreset = async (presetId: string) => {
  try {
    await client.createTimeSpanFromPreset({
      input: {
        start: getISOTimestamp(),
        presetId,
        stopPreviousRunning,
      },
    });
    showHUD("Timer started");
    popToRoot();
  } catch (e: unknown) {
    let errorMessage = String(e);
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    showToast({ style: Toast.Style.Failure, title: "Failed to start timer from preset", message: errorMessage });
  }
};

export const createTimeSpan = async (values: TimeSpanEditFormValues) => {
  try {
    await client.createTimeSpan({
      input: {
        tags: values.tags,
        start: getISOTimestamp(values.startTime),
        end: values.endTime ? getISOTimestamp(values.endTime) : undefined,
        note: values.note && values.note.length > 0 ? values.note : undefined,
        stopPreviousRunning,
      },
    });
    if (values.endTime) {
      showHUD("Time span created");
    } else {
      showHUD("Timer started");
    }
    popToRoot();
  } catch (e: unknown) {
    let errorMessage = String(e);
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    showToast({ style: Toast.Style.Failure, title: "Failed to start timer", message: errorMessage });
  }
};

export const updateTimeSpan = async (id: string, values: TimeSpanEditFormValues) => {
  try {
    await client.updateTimeSpan({
      id,
      input: {
        tags: values.tags,
        start: getISOTimestamp(values.startTime),
        end: values.endTime ? getISOTimestamp(values.endTime) : undefined,
        note: values.note && values.note.length > 0 ? values.note : undefined,
      },
    });
    showHUD("Changes saved");
    popToRoot();
  } catch (e: unknown) {
    let errorMessage = String(e);
    if (e instanceof Error) {
      errorMessage = e.message;
    }
    showToast({ style: Toast.Style.Failure, title: "Failed to update time span", message: errorMessage });
  }
};
