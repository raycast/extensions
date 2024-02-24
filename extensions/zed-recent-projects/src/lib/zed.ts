export type ZedBuild = "Zed" | "Zed Preview";
export type ZedBundleId = "dev.zed.Zed" | "dev.zed.Zed-Preview";

const ZedBundleIdBuildMapping: Record<ZedBuild, ZedBundleId> = {
  Zed: "dev.zed.Zed",
  "Zed Preview": "dev.zed.Zed-Preview",
};

export function getZedBundleId(build: ZedBuild): ZedBundleId {
  return ZedBundleIdBuildMapping[build];
}
