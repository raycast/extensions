import { getPreferenceValues } from "@raycast/api";

export const preferences: {
  enableMenubar: boolean;
} = getPreferenceValues();
