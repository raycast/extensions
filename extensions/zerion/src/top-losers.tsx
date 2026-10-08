import { open } from "@raycast/api";

export default function TopLosers() {
  return open("https://app.zerion.io/explore/top_movers?sort=top_losers_1d");
}
