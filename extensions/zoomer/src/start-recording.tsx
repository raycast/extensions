import { openZoomerUrl, zoomerUrl } from "./lib/zoomer";

export default async function Command() {
  await openZoomerUrl(zoomerUrl("start-recording"));
}
