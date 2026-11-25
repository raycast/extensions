import type { LaunchProps } from "@raycast/api";

import { normalizeScreenshotOutput, openZoomerUrl, zoomerUrl } from "./lib/zoomer";

export default async function Command(props: LaunchProps<{ arguments: Arguments.CaptureScrolling }>) {
  const output = normalizeScreenshotOutput(props.arguments.output);
  await openZoomerUrl(zoomerUrl("capture-scrolling", { output }), {
    commandTitle: "Capture Scrolling Area",
    minimumVersion: "0.5.197",
  });
}
