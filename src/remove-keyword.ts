import { LaunchProps, showHUD } from "@raycast/api";
import { writeKeywords, readKeywords, KEYWORDS_FILE_PATH } from "./lib/keywords-manager";

// Type for command arguments
type RemoveKeywordArguments = {
  keyword: string;
};

export default async function Command(props: LaunchProps<{ arguments: RemoveKeywordArguments }>) {
  try {
    const { keyword } = props.arguments;

    // Read keywords from file once
    const keywords = await readKeywords(KEYWORDS_FILE_PATH);

    // Check if keyword exists
    if (!keywords.includes(keyword.trim())) {
      await showHUD(`❎ Keyword '${keyword}' does not exist`);
      return;
    }

    // Remove keyword and write to file
    const updatedKeywords = keywords.filter((k) => k.trim() !== keyword.trim());
    await writeKeywords(updatedKeywords);
    await showHUD(`✅ Removed keyword: '${keyword}'`, { clearRootSearch: true });
  } catch (error) {
    console.error("Error in remove-keyword:", error);
    await showHUD("❌ Remove keyword failed");
  }
}
