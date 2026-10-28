import path = require("path");
import { createHash } from "crypto";
import Cite = require("citation-js");

export interface ReferenceStylePreferences {
  zotero_path: string;
  csl_style?: string;
  csl_source?: string;
  custom_csl_path?: string;
  reference_output?: string;
}

export function getReferenceTemplate(preferences: ReferenceStylePreferences) {
  if (preferences.csl_source === "custom") {
    const customPath = preferences.custom_csl_path?.trim();
    if (!customPath || path.extname(customPath).toLowerCase() !== ".csl") {
      throw new Error('Set "Custom CSL File" to a .csl file, or switch "CSL Source" to Installed Style.');
    }
    return { path: customPath, custom: true };
  }

  const name = preferences.csl_style || "ieee";
  return {
    name,
    path: path.join(path.dirname(preferences.zotero_path), "styles", `${name}.csl`),
    custom: false,
  };
}

export function formatReference(
  entry: unknown,
  template: string,
  selection: ReturnType<typeof getReferenceTemplate>,
  output = "bibliography",
  customLocales: Record<string, string> = {},
): string {
  const note = output === "note";
  // Inspect the root element, ignoring comments that may contain example styles.
  const style = template.replace(/<!--[\s\S]*?-->/g, "").match(/<style\b[^>]*>/)?.[0];
  if (note && !/\bclass\s*=\s*["']note["']/.test(style || "")) {
    throw new Error(
      'Note output requires a note-based CSL style. Choose a note style or set "Reference Output" to Bibliography.',
    );
  }

  // citation-js caches processors by template name. A content hash picks up edits
  // to the same custom file and avoids collisions between equal file basenames.
  const name = selection.custom ? `custom-${createHash("sha256").update(template).digest("hex")}` : selection.name;
  Cite.CSL.register.addTemplate(name, template);
  const cite = new Cite(JSON.stringify([entry]));
  const locales = Cite.plugins.config.get("@csl").locales;
  const previous = Object.keys(customLocales).map(
    (locale) => [locale, locales.has(locale), locales.get(locale)] as const,
  );

  try {
    if (selection.custom) {
      for (const [locale, xml] of Object.entries(customLocales)) locales.add(locale, xml);
    }
    return cite.format(note ? "citation" : "bibliography", {
      template: name,
      // Installed styles retain the existing en-US behavior. Custom styles use
      // their own default-locale and inline locale overrides.
      lang: selection.custom ? undefined : "en-US",
    });
  } finally {
    if (selection.custom) {
      for (const [locale, existed, xml] of previous) {
        if (existed) locales.add(locale, xml);
        else locales.remove(locale);
      }
    }
  }
}
