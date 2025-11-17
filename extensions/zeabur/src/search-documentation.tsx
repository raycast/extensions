import { List, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { Language, Documentation } from "./type";
import { getLanguages, getDocumentation } from "./utils/documentation";

export default function Command() {
  const [currentLanguage, setCurrentLanguage] = useCachedState<string>("language", "");

  const { data, isLoading } = useCachedPromise(async () => {
    const lang = (await getLanguages()) as Language[];
    const doc = (await getDocumentation()) as Documentation;

    return { lang, doc };
  });

  const currentDoc = data?.doc[currentLanguage];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search documentation"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Language of Zeabur Docs"
          storeValue={true}
          onChange={(value) => {
            setCurrentLanguage(value);
          }}
        >
          {data?.lang.map((lang: Language) => (
            <List.Dropdown.Item key={lang.locale} title={lang.name} value={lang.locale} />
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
                    <Action.CopyToClipboard
                      title="Copy Documentation URL"
                      content={url}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
