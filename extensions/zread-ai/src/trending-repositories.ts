import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    await open("https://zread.ai/trending");
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open Trending Page" });
  }
}
