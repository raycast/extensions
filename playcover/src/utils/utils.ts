import { getApplications, showToast, Toast } from "@raycast/api";
export async function isPlayCoverInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === "io.playcover.PlayCover");
}

export async function showPlayCoverNotInstalledToast() {
  const isInstalled = await isPlayCoverInstalled();

  if (!isInstalled) {
    await showToast({
      style: Toast.Style.Failure,
      title: "You don't have PlayCover Installed",
      message: "Please install Playcover",
    });
    return undefined;
  }
}