import { getPreferenceValues } from "@raycast/api";
import { resolveTitleLanguage } from "./languages";

export type FilenameStyle = "title" | "kebab" | "snake";

export type ZushPreferences = {
  apiKey: string;
  model: string;
  filenameStyle: FilenameStyle;
  titleLanguage: string;
  customInstructions: string;
};

const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_STYLE: FilenameStyle = "title";

/**
 * Every field is read defensively. `required: true` is supposed to stop the
 * command from launching without a key, but it does not hold in development, and
 * a manifest default is not guaranteed to be materialised either. Reading
 * `raw.apiKey.trim()` directly crashed the command instead of asking for a key.
 */
export function preferences(): ZushPreferences {
  const raw = getPreferenceValues<Preferences>();
  return {
    apiKey: raw.apiKey?.trim() ?? "",
    model: raw.model?.trim() || DEFAULT_MODEL,
    filenameStyle: raw.filenameStyle ?? DEFAULT_STYLE,
    // "system" becomes a concrete language here, so the prompt never sees a token.
    titleLanguage: resolveTitleLanguage(raw.titleLanguage?.trim() ?? ""),
    customInstructions: raw.customInstructions?.trim() ?? "",
  };
}
