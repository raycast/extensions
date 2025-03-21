import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { readKeywords, writeKeywords } from "./lib/keywords-manager";

export default function Command() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadKeywords();
  }, []);

  async function loadKeywords() {
    try {
      const keywordsList = await readKeywords();
      setKeywords(keywordsList);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "❌ Read keywords failed",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveKeyword(keyword: string) {
    try {
      const newKeywords = keywords.filter((k) => k !== keyword);
      await writeKeywords(newKeywords);
      setKeywords(newKeywords);
      showToast({
        style: Toast.Style.Success,
        title: `Removed keyword: ${keyword}`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "❌ Failed to remove keyword",
        message: String(error),
      });
    }
  }

  return (
    <List isLoading={isLoading}>
      {keywords.map((keyword) => (
        <List.Item
          key={keyword}
          title={keyword}
          actions={
            <ActionPanel>
              <Action
                title="Remove Keyword"
                onAction={() => handleRemoveKeyword(keyword)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
