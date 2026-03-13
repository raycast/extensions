import { open } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";

export default function Overview(props: LaunchProps) {
  return open(`https://app.zerion.io/${props.arguments.account}/overview`);
}
