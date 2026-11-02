import { Clipboard, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { generateReference, generateBibtexReference } from "./references";

// Generate the text first: copying or pasting before it is ready would write an
// empty string, and the HUD would claim success even when generating failed.
async function copyToClipboard(generate: () => Promise<string>) {
  const content = await generate().catch(reportFailure);
  if (content === undefined) return;
  await Clipboard.copy(content);
  await showHUD("Copied to Clipboard");
}

async function pasteToApp(generate: () => Promise<string>) {
  const content = await generate().catch(reportFailure);
  if (content === undefined) return;
  await Clipboard.paste(content);
  await showHUD("Pasted to App");
  await popToRoot();
}

async function reportFailure(error: unknown): Promise<undefined> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Could not generate the reference",
    message: error instanceof Error ? error.message : String(error),
  });
  return undefined;
}

export async function exportRef(bibtexKey: string) {
  await copyToClipboard(() => generateReference(bibtexKey));
}

export async function exportRefPaste(bibtexKey: string) {
  await pasteToApp(() => generateReference(bibtexKey));
}

export async function exportBibtexRef(bibtexKey: string) {
  await copyToClipboard(() => generateBibtexReference(bibtexKey));
}

export async function exportBibtexRefPaste(bibtexKey: string) {
  await pasteToApp(() => generateBibtexReference(bibtexKey));
}

export async function exportPandocKey(bibtexKey: string) {
  await copyToClipboard(async () => `[@${bibtexKey}]`);
}

export async function exportPandocKeyPaste(bibtexKey: string) {
  await pasteToApp(async () => `[@${bibtexKey}]`);
}
