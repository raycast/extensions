import { getPreferenceValues } from "@raycast/api";

export type Preferences = {
  slackBotToken: string;
  defaultChannels: string[];
  quickNoteDefaultChannels: string[];
};

const splitCsv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim().replace(/^#/, ""))
    .filter((s) => s.length > 0);

export function loadPreferences(): Preferences {
  const raw = getPreferenceValues<ExtensionPreferences>();
  const defaultChannels = splitCsv(raw.defaultChannels);
  const quickNoteDefaultChannels = splitCsv(raw.quickNoteDefaultChannels);
  return {
    slackBotToken: raw.slackBotToken.trim(),
    defaultChannels,
    quickNoteDefaultChannels,
  };
}
