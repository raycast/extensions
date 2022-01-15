import { ActionPanel, CopyToClipboardAction, List, KeyboardShortcut, Icon, OpenInBrowserAction } from "@raycast/api";
import type { QueryResultItem } from "./zoteroApi";
import { useVisitedUrls } from "./useVisitedUrls";

type Props = {
  sectionNames: string[];
  queryResults: QueryResultItem[][];
  isLoading: boolean;
  onSearchTextChange?: (text: string) => void;
  throttle?: boolean;
};

const copyRefCommandShortcut: KeyboardShortcut = { modifiers: ["cmd", "shift"], key: "1" };
const openExtLinkCommandShortcut: KeyboardShortcut = { modifiers: ["cmd", "shift"], key: "2" };
const openZoteroLinkCommandShortcut: KeyboardShortcut = { modifiers: ["cmd", "shift"], key: "3" };

export const View = ({ sectionNames, queryResults, isLoading, onSearchTextChange, throttle }: Props): JSX.Element => {
  const [urls, onOpen] = useVisitedUrls();
  return (
    <List isLoading={isLoading} onSearchTextChange={onSearchTextChange} throttle={throttle}>
      {sectionNames.map((sectionName, sectionIndex) => (
        <List.Section
          key={sectionIndex}
          id={`${sectionIndex}`}
          title={sectionName}
          subtitle={`${queryResults[sectionIndex].length}`}
        >
          {queryResults[sectionIndex].map((item) => (
            <List.Item
              key={item.id}
              id={item.id}
              title={item.title + (urls.includes(item.url) ? " (visited)" : "")}
              subtitle={item.subtitle}
              icon={item.icon !== "" ? item.icon : Icon.Document}
              accessoryTitle={item.accessoryTitle}
              actions={
                <ActionPanel>
                  <OpenInBrowserAction title="Open in Zotero" url={item.url} onOpen={onOpen} />
                  <CopyToClipboardAction title="Copy URL" content={item.link} />
                  <CopyToClipboardAction
                    title="Copy As Reference"
                    content={item.bib}
                    shortcut={copyRefCommandShortcut}
                  />
                  <OpenInBrowserAction
                    icon={Icon.Link}
                    title="Open Original Link"
                    url={item.raw_link}
                    shortcut={openExtLinkCommandShortcut}
                    onOpen={onOpen}
                  />
                  <OpenInBrowserAction
                    icon={Icon.Globe}
                    title="Open Zotero Link"
                    url={item.link}
                    shortcut={openZoteroLinkCommandShortcut}
                    onOpen={onOpen}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};
