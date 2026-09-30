import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { Preferences, resolveHome } from "./zoteroApi";
import { readFile } from "fs/promises";
import Cite = require("citation-js");

export async function generateReference(key: string): Promise<string> {
  const preferences: Preferences = getPreferenceValues();
  const templateName = preferences.csl_style;
  const templatePath = preferences.zotero_path.replace("/zotero.sqlite", `/styles/${templateName}.csl`);
  const template = await readFile(resolveHome(templatePath));

  Cite.CSL.register.addTemplate(templateName, template.toString());

  const db = await readFile(resolveHome(preferences.bibtex_path));
  const js = JSON.parse(db.toString()).filter((r) => {
    return r.id === key;
  });

  if (js.length < 1) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Bibtex Entry not Found!",
      message: `Bibtex Entry ${key} can't be found!`,
    });
    return "";
  }

  const cite = new Cite(JSON.stringify(js));

  return cite.format("bibliography", {
    template: templateName,
    lang: "en-US",
  });
}

export async function generateBibtexReference(key: string): Promise<string> {
  const preferences: Preferences = getPreferenceValues();
  const db = await readFile(resolveHome(preferences.bibtex_path));
  const js = JSON.parse(db.toString()).filter((r) => {
    return r.id === key;
  });

  if (js.length < 1) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Bibtex Entry not Found!",
      message: `Bibtex Entry ${key} can't be found!`,
    });
    return "";
  }

  const cite = new Cite(JSON.stringify(js));

  return cite.format("bibtex");
}
