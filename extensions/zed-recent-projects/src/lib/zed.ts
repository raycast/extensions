export type ZedBuild = Preferences["build"];
export type ZedBundleId = "dev.zed.Zed" | "dev.zed.Zed-Preview";

const ZedBundleIdBuildMapping: Record<ZedBuild, ZedBundleId> = {
  Zed: "dev.zed.Zed",
  "Zed Preview": "dev.zed.Zed-Preview",
};

const ZedDbNameMapping: Record<ZedBuild, string> = {
  Zed: "0-stable",
  "Zed Preview": "0-preview",
};

export function getZedBundleId(build: ZedBuild): ZedBundleId {
  return ZedBundleIdBuildMapping[build];
}

export function getZedDbName(build: ZedBuild): string {
  return ZedDbNameMapping[build];
}
