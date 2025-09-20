import { open } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";

export default function Overview(props: LaunchProps<{ arguments: Arguments.Collection }>) {
  const collection = props.arguments.collection
    .trim() // Trim whitespace
    .toLowerCase() // Convert to lowercase
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w-]/g, ""); // Remove all non-word chars

  return open(`https://app.zerion.io/collections/${collection}`);
}
