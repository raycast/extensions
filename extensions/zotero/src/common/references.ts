import { environment, getPreferenceValues } from "@raycast/api";
import { Preferences, resolveHome } from "./zoteroApi";
import { readFile } from "fs/promises";
import Cite = require("citation-js");
import path = require("path");
import { formatReference, getReferenceTemplate } from "./referenceStyle";

let customLocales: Promise<Record<string, string>> | undefined;

function loadCustomLocales(): Promise<Record<string, string>> {
  return (customLocales ??= Promise.all(
    ["zh-CN", "ja-JP"].map(async (locale) => [
      locale,
      await readFile(path.join(environment.assetsPath, "locales", `locales-${locale}.xml`), "utf8"),
    ]),
  ).then(Object.fromEntries));
}

async function read(path: string, missingHint: string): Promise<string> {
  try {
    return (await readFile(resolveHome(path))).toString();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`${path} does not exist. ${missingHint}`);
    }
    throw new Error(`Could not read ${path}: ${(error as Error).message}`);
  }
}

async function findEntry(key: string): Promise<unknown> {
  const preferences: Preferences = getPreferenceValues();
  const db = await read(
    preferences.bibtex_path,
    'Set "Better Bibtex CSL JSON File" in the extension settings to a Better BibTeX CSL JSON export of your library.',
  );

  let entries: { id?: string }[];
  try {
    entries = JSON.parse(db);
  } catch (error) {
    throw new Error(`${preferences.bibtex_path} is not valid JSON: ${(error as Error).message}`);
  }

  const entry = entries.find((r) => r.id === key);
  if (!entry) {
    throw new Error(`Bibtex entry ${key} can't be found in ${preferences.bibtex_path}.`);
  }
  return entry;
}

export async function generateReference(key: string): Promise<string> {
  const preferences: Preferences = getPreferenceValues();
  const selection = getReferenceTemplate(preferences);
  const template = await read(
    selection.path,
    selection.custom
      ? 'Update "Custom CSL File" in the extension settings, or switch "CSL Source" to Installed Style.'
      : `Install the ${selection.name} style in Zotero, or pick another CSL format.`,
  );
  const entry = await findEntry(key);
  const locales = selection.custom ? await loadCustomLocales() : {};

  try {
    return formatReference(entry, template, selection, preferences.reference_output, locales);
  } catch (error) {
    throw new Error(`Could not format reference with ${selection.path}: ${(error as Error).message}`);
  }
}

export async function generateBibtexReference(key: string): Promise<string> {
  const cite = new Cite(JSON.stringify([await findEntry(key)]));

  return cite.format("bibtex");
}
