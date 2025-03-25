import { open } from "@raycast/api";

export default function Overview() {
  return open("https://app.zerion.io/explore/top-gainers?sort=relative_changes.1d%3Adesc");
}
