import type { LaunchProps } from "@raycast/api";

import { normalizeSettingsSection, openZoomerUrl, zoomerUrl } from "./lib/zoomer";

export default async function Command(props: LaunchProps<{ arguments: Arguments.OpenSettings }>) {
  const section = normalizeSettingsSection(props.arguments.section);
  await openZoomerUrl(zoomerUrl("open-settings", { section }));
}
