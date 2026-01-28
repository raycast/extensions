import { getApplications } from "@raycast/api";

const znotchBundleId = "xyz.kondor.znotch";

export async function isZNotchInstalled() {
  const installedApplications = await getApplications();
  return installedApplications.some(({ bundleId }) => bundleId === znotchBundleId);
}
