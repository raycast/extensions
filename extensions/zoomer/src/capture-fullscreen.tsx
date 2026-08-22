import type { LaunchProps } from "@raycast/api";

import { normalizeScreenshotOutput, openZoomerUrl, zoomerUrl } from "./lib/zoomer";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CaptureFullscreen }>) {
  const output = normalizeScreenshotOutput(props.arguments.output);
  await openZoomerUrl(zoomerUrl("capture-fullscreen", { output }));
}
