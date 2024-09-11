import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Language, Documentation } from "./type";
import { getLanguages, getDocumentation } from "./util";
import { useState } from "react";

export default function Command() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [documentation, setDocumentation] = useState<Documentation>({});
  const [currentLanguage, setCurrentLanguage] = useState<string>("");

  const { isLoading } = useCachedPromise(async () => {
    const lang = await getLanguages();
    setLanguages(lang as Language[]);
    const doc = await getDocumentation();
    setDocumentation(doc as Documentation);
  });

  const currentDoc = documentation[currentLanguage];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="search documentation"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Language of Zeabur Docs"
          storeValue={true}
          onChange={(value) => {
            setCurrentLanguage(value);
          }}
        >
          {languages.map((lang: Language) => (
            <List.Dropdown.Item key={lang.locale} title={lang.text} value={lang.locale} />
          ))}
        </List.Dropdown>
      }
    >
      {currentDoc &&
        Object.entries(currentDoc).map(([sectionTitle, section]) => (
          <List.Section title={sectionTitle} key={sectionTitle}>
            {Object.entries(section).map(([topic, url]) => (
              <List.Item
                key={topic}
                keywords={[topic, sectionTitle]}
                title={topic}
                icon={{ source: "extension-icon.png" }}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={url} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
