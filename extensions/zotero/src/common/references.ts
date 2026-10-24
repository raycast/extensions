import { getPreferenceValues } from "@raycast/api";
import { Preferences, resolveHome } from "./zoteroApi";
import { readFile } from "fs/promises";
import Cite = require("citation-js");

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
  const templateName = preferences.csl_style;
  const templatePath = preferences.zotero_path.replace("/zotero.sqlite", `/styles/${templateName}.csl`);
  const template = await read(templatePath, `Install the ${templateName} style in Zotero, or pick another CSL format.`);

  Cite.CSL.register.addTemplate(templateName, template);

  const cite = new Cite(JSON.stringify([await findEntry(key)]));

  return cite.format("bibliography", {
    template: templateName,
    lang: "en-US",
  });
}

export async function generateBibtexReference(key: string): Promise<string> {
  const cite = new Cite(JSON.stringify([await findEntry(key)]));

  return cite.format("bibtex");
}
