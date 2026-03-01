import { Clipboard, showHUD } from "@raycast/api";
import { generateFakeId } from "south-african-fake-id-generator";

export default async () => {
  const no = generateFakeId();
  await Clipboard.copy(no);
  await showHUD(`✅ Copied ZA ID ${no} to clipboard`);
};
