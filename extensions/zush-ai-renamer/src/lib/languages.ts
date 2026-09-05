/**
 * The languages the Zush macOS app can name files in, by ISO 639-1 code. This set
 * mirrors `AnalysisOutputLanguage.supportedLanguageCodes` in the app, and the
 * `titleLanguage` dropdown in package.json is generated from it, so a language
 * offered on one surface is offered on the other.
 */
export const SUPPORTED_LANGUAGES: Record<string, string> = {
  af: "Afrikaans",
  sq: "Albanian",
  am: "Amharic",
  ar: "Arabic",
  hy: "Armenian",
  az: "Azerbaijani",
  eu: "Basque",
  be: "Belarusian",
  bn: "Bengali",
  bs: "Bosnian",
  bg: "Bulgarian",
  ca: "Catalan",
  zh: "Chinese",
  hr: "Croatian",
  cs: "Czech",
  da: "Danish",
  nl: "Dutch",
  en: "English",
  et: "Estonian",
  fi: "Finnish",
  fr: "French",
  gl: "Galician",
  ka: "Georgian",
  de: "German",
  el: "Greek",
  gu: "Gujarati",
  he: "Hebrew",
  hi: "Hindi",
  hu: "Hungarian",
  is: "Icelandic",
  id: "Indonesian",
  ga: "Irish",
  it: "Italian",
  ja: "Japanese",
  kn: "Kannada",
  kk: "Kazakh",
  ko: "Korean",
  lv: "Latvian",
  lt: "Lithuanian",
  mk: "Macedonian",
  ms: "Malay",
  ml: "Malayalam",
  mt: "Maltese",
  mr: "Marathi",
  mn: "Mongolian",
  ne: "Nepali",
  no: "Norwegian",
  fa: "Persian",
  pl: "Polish",
  pt: "Portuguese",
  pa: "Punjabi",
  ro: "Romanian",
  ru: "Russian",
  sr: "Serbian",
  sk: "Slovak",
  sl: "Slovenian",
  es: "Spanish",
  sw: "Swahili",
  sv: "Swedish",
  ta: "Tamil",
  te: "Telugu",
  th: "Thai",
  tr: "Turkish",
  uk: "Ukrainian",
  ur: "Urdu",
  uz: "Uzbek",
  vi: "Vietnamese",
  cy: "Welsh",
};

/** Dropdown value meaning "whatever this Mac is set to". */
export const SYSTEM_LANGUAGE = "system";

/** What the app falls back to, matching its own `fallbackLanguageCode`. */
const FALLBACK_LANGUAGE = "English";

/**
 * Turns the stored preference into the language name the prompt asks for. Always
 * a real language: an explicit choice, or this Mac's own, or English.
 *
 * An empty value is treated as System Language. Raycast does not guarantee that a
 * default is materialised, and there is no longer a setting that means "leave the
 * language to the file".
 */
export function resolveTitleLanguage(value: string, locale = systemLocale()): string {
  if (value && value !== SYSTEM_LANGUAGE) return value;
  return languageForLocale(locale) ?? FALLBACK_LANGUAGE;
}

/** The primary subtag of a locale, if it is a language this extension can request. */
export function languageForLocale(locale: string): string | undefined {
  const code = locale.trim().split(/[-_.]/)[0]?.toLowerCase();
  return code ? SUPPORTED_LANGUAGES[code] : undefined;
}

function systemLocale(): string {
  try {
    // Follows the Mac's own language; LANG covers the case where ICU has no answer.
    return Intl.DateTimeFormat().resolvedOptions().locale || process.env.LANG || "en";
  } catch {
    return process.env.LANG || "en";
  }
}
