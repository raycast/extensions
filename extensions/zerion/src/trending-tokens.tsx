import { open } from "@raycast/api";

export default function TrendingTokens() {
  return open("https://app.zerion.io/trending");
}
