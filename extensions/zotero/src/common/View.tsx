import { ActionPanel, List, Icon, Action, Keyboard, getPreferenceValues } from "@raycast/api";
import { RefData, Preferences } from "./zoteroApi";
import { useVisitedUrls } from "./useVisitedUrls";
import { exportRef, exportRefPaste, exportBibtexRef, exportBibtexRefPaste } from "./clipboard";

type Props = {
  sectionNames: string[];
  queryResults: RefData[][];
  isLoading: boolean;
  onSearchTextChange?: (text: string) => void;
  throttle?: boolean;
};

const openExtLinkCommandShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "1" };
const copyRefCommandShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "2" };
const copyRefShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "3" };
const copyBibShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "4" };
const pasteRefShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "5" };
const pasteBibShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "6" };

function getURL(item: RefData): string {
  return `${
    item.url
      ? item.url
      : `${item.attachment.url ? item.attachment.url : `${item.DOI ? "https://doi.org/" + item.DOI : ""}`}`
  }`;
}

function getItemDetail(item: RefData): string {
  return `## [${item.title}](zotero://open-pdf/library/items/${item.attachment.key})

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

${item.tags ? "**Tagged With:** " + item.tags.join(", ") : ""}

`;
}

export const View = ({ sectionNames, queryResults, isLoading, onSearchTextChange, throttle }: Props): JSX.Element => {
  const [urls, onOpen] = useVisitedUrls();
  const preferences: Preferences = getPreferenceValues();
  return (
    <List
      isShowingDetail={queryResults[0].length > 0}
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
      throttle={throttle}
    >
      {queryResults[0].length < 1 ? (
        <List.EmptyView icon={{ source: "no-view.png" }} title="Type something to search Zotero Database!" />
      ) : (
        sectionNames.map((sectionName, sectionIndex) => (
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
                      url={`zotero://select/items/${item.library ? item.library : 0}_${item.key}`}
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
                    {preferences.use_bibtex && <RefCopyToClipboardAction selected={item.citekey} />}
                    {preferences.use_bibtex && <BibCopyToClipboardAction selected={item.citekey} />}
                    {preferences.use_bibtex && <RefPasteAction selected={item.citekey} />}
                    {preferences.use_bibtex && <BibPasteAction selected={item.citekey} />}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
};

function RefPasteAction({ selected }: { selected: string }) {
  return (
    <Action
      title="Paste Reference to App"
      icon={Icon.TextDocument}
      shortcut={pasteRefShortcut}
      onAction={() => exportRefPaste(selected)}
    />
  );
}

function RefCopyToClipboardAction({ selected }: { selected: string }) {
  return (
    <Action
      title="Copy Reference to Clipboard"
      icon={Icon.Clipboard}
      shortcut={copyRefShortcut}
      onAction={() => exportRef(selected)}
    />
  );
}

function BibPasteAction({ selected }: { selected: string }) {
  return (
    <Action
      title="Paste Bibtex Entry to App"
      icon={Icon.TextDocument}
      shortcut={pasteBibShortcut}
      onAction={() => exportBibtexRefPaste(selected)}
    />
  );
}

function BibCopyToClipboardAction({ selected }: { selected: string }) {
  return (
    <Action
      title="Copy Bibtex Entry to Clipboard"
      icon={Icon.Clipboard}
      shortcut={copyBibShortcut}
      onAction={() => exportBibtexRef(selected)}
    />
  );
}
