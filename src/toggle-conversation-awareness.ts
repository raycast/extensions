import {
  closeMainWindow,
  getPreferenceValues,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { execAirPodsMenu } from "./airpods-menu";
import { Prefs } from "./type";

export default async function main() {
  const prefs = getPreferenceValues<Prefs>();
  await closeMainWindow();
  const res = await execAirPodsMenu(
    {
      ...prefs,
      airpodsIndex: parseInt(prefs.airpodsIndex, 10),
    },
    "conversation-awareness",
  );
  if (prefs.showHudCA && res) {
    showHUD(res);
    await updateCommandMetadata({ subtitle: `Status: ${res}` });
  }
}
