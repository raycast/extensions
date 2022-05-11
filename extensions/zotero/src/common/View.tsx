import { ActionPanel, List, Icon, Action, Keyboard, getPreferenceValues } from "@raycast/api";
import { RefData, Preferences } from "./zoteroApi";
import { useVisitedUrls } from "./useVisitedUrls";

type Props = {
  sectionNames: string[];
  queryResults: RefData[][];
  isLoading: boolean;
  onSearchTextChange?: (text: string) => void;
  throttle?: boolean;
};

const openExtLinkCommandShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "1" };
const copyRefCommandShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "2" };

function getURL(item: RefData): string {
  return `${
    item.url
      ? item.url
      : `${item.attachment.url ? item.attachment.url : `${item.DOI ? "https://doi.org/" + item.DOI : ""}`}`
  }`;
}

function getItemDetail(item: RefData): string {
  return `## ${item.title}

${
  item.url
    ? "**URL:** [" + item.url + "](" + item.url + ")"
    : item.attachment.url
    ? "**URL:** [" + item.attachment.url + "](" + item.attachment.url + ")"
    : ""
}

${item.publicationTitle ? "**Publication:** " + item.publicationTitle : ""}

${item.publisher ? "**Publisher:** " + item.publisher : ""}

${item.date ? "**Publication Date:** " + item.date : ""}

${item.DOI ? "**DOI:** [" + item.DOI + "](" + "https://doi.org/" + item.DOI + ")" : ""}

${item.abstractNote ? "**Abstract:** " + item.abstractNote : ""}

${item.tags.length > 0 ? "**Tagged With:** " + item.tags.join(", ") : ""}

`;
}

export const View = ({ sectionNames, queryResults, isLoading, onSearchTextChange, throttle }: Props): JSX.Element => {
  const [urls, onOpen] = useVisitedUrls();
  const preferences: Preferences = getPreferenceValues();
  return (
    <List isShowingDetail isLoading={isLoading} onSearchTextChange={onSearchTextChange} throttle={throttle}>
      {sectionNames.map((sectionName, sectionIndex) => (
        <List.Section
          key={sectionIndex}
          id={`${sectionIndex}`}
          title={sectionName}
          subtitle={`${queryResults[sectionIndex].length}`}
        >
          {queryResults[sectionIndex].map((item) => (
            <List.Item
              key={item.key}
              id={`${item.id}`}
              title={item.title + (urls.includes(item.url) ? " (visited)" : "")}
              icon={`${item.type.toLowerCase() === "book" ? "doc.png" : "paper.png"}`}
              detail={<List.Item.Detail markdown={getItemDetail(item)} />}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open in Zotero"
                    url={`zotero://select/items/0_${item.key}`}
                    onOpen={onOpen}
                  />
                  {item.attachment && item.attachment.key !== `` && (
                    <Action.OpenInBrowser
                      icon={Icon.Document}
                      title="Open PDF"
                      url={`zotero://open-pdf/library/items/${item.attachment.key}`}
                      onOpen={onOpen}
                    />
                  )}
                  {getURL(item) !== "" && (
                    <Action.OpenInBrowser
                      icon={Icon.Link}
                      title="Open Original Link"
                      url={getURL(item)}
                      shortcut={openExtLinkCommandShortcut}
                      onOpen={onOpen}
                    />
                  )}
                  {preferences.use_bibtex && (
                    <Action.CopyToClipboard
                      title="Copy Bibtex Citation Key"
                      content={item.citekey}
                      shortcut={copyRefCommandShortcut}
                    />
                  )}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
};
