import { open } from "@raycast/api";

export default function TopGainers() {
  return open("https://app.zerion.io/explore/top_movers?sort=top_gainers_1d");
}
