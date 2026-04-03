import { open } from "@raycast/api";
import { getServerUrl } from "./preferences";

export default async function OpenDashboardCommand() {
  await open(getServerUrl());
}
