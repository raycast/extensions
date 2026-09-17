import { getPreferenceValues } from "@raycast/api";

export function getEnv() {
  const { environmentPath } = getPreferenceValues<Preferences.CmdConnect>();

  const patchedWithoutDuplicates = new Set([
    ...(process.env.PATH?.split(":") ?? []),
    ...(environmentPath?.split(":") ?? []),
  ]);

  const pathString = Array.from(patchedWithoutDuplicates).join(":");

  const env = Object.assign({}, process.env, {
    PATH: pathString,
    LANG: "en_US.UTF-8",
    LC_ALL: "en_US.UTF-8",
  });

  return env;
}
