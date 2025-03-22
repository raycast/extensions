import { Clipboard, popToRoot, showHUD } from "@raycast/api";
import { generateReference, generateBibtexReference } from "./references";

export async function exportRef(bibtexKey: string) {
  await showHUD("Copied to Clipboard");
  await Clipboard.copy(await generateReference(bibtexKey));
}

export async function exportRefPaste(bibtexKey: string) {
  await showHUD("Pasted to App");
  await Clipboard.paste(await generateReference(bibtexKey));
  await popToRoot();
}

export async function exportBibtexRef(bibtexKey: string) {
  await showHUD("Copied to Clipboard");
  await Clipboard.copy(await generateBibtexReference(bibtexKey));
}

export async function exportBibtexRefPaste(bibtexKey: string) {
  await showHUD("Pasted to App");
  await Clipboard.paste(await generateBibtexReference(bibtexKey));
  await popToRoot();
}
