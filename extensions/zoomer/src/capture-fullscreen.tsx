import type { LaunchProps } from "@raycast/api";

import {
  normalizeScreenshotOutput,
  openZoomerUrl,
  zoomerUrl,
} from "./lib/zoomer";

type Arguments = {
  output?: string;
};

export default async function Command(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const output = normalizeScreenshotOutput(props.arguments.output);
  await openZoomerUrl(zoomerUrl("capture-fullscreen", { output }));
}
