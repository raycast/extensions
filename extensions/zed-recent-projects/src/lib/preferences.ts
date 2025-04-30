import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export const zedBuild = preferences.build;

export const showGitBranch = preferences.showGitBranch;
