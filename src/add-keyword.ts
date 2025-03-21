import { LaunchProps, showHUD } from "@raycast/api";
import { writeKeywords, readKeywords } from "./lib/keywordStorage";
import { showFailureToast } from "@raycast/utils";

// Type for command arguments
type AddKeywordArguments = {
  keyword: string;
};

export default async function Command(props: LaunchProps<{ arguments: AddKeywordArguments }>) {
  try {
    let { keyword } = props.arguments;
    keyword = keyword.trim();

    const keywords = await readKeywords();

    // Check if keyword already exists
    if (keywords.includes(keyword)) {
      await showHUD(`❎ Keyword ${keyword} already exists`);
      return;
    }

    // Add keyword and write
    keywords.push(keyword);
    await writeKeywords(keywords);
    await showHUD(`✅ Added keyword: ${keyword}`, { clearRootSearch: true });
  } catch (error) {
    showFailureToast(error, { title: "Error adding keyword" });
  }
}
