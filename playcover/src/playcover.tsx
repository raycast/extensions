import { getApplications, open } from "@raycast/api";
import { showPlayCoverNotInstalledToast } from "./utils/utils";
import os from "node:os";

const playcover = async () => {
  const applications = await getApplications();
  await showPlayCoverNotInstalledToast()
  const PlayCover = applications.filter((app) => app.name === "PlayCover")[0];
  if (PlayCover) {
    await open(`${os.homedir()}${PlayCover.path}`, PlayCover.name)
  }
  return null;

};

export default playcover;