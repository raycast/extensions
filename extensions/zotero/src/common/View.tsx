import {
  ActionPanel,
  List,
  Icon,
  Action,
  Keyboard,
  getPreferenceValues,
  Clipboard,
  closeMainWindow,
  showHUD,
} from "@raycast/api";
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

const CopyToClipboard = (props) => {
  return (
    <Action
      title={props.title}
      icon={props.icon}
      onAction={() => {
        Clipboard.copy(props.content);
        closeMainWindow();
        showHUD(props.message);
      }}
      shortcut={props.shortcut}
    />
  );
};

const openExtLinkCommandShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "o" };
const copyRefCommandShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "2" };
const copyRefShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "3" };
const copyBibShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "4" };
const pasteRefShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "5" };
const pasteBibShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "6" };

const copyTitleShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "." };
const copyAuthorsShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "." };
const copyZoteroUrlShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "c" };
const copyDoiShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "d" };

function getURL(item: RefData): string {
  return `${
    item.url
      ? item.url
      : `${item.attachment.url ? item.attachment.url : `${item.DOI ? "https://doi.org/" + item.DOI : ""}`}`
  }`;
}

function getItemTitle(item: RefData): string {
  return `${item.title}`;
}

function getItemAuthors(item: RefData): string {
  return `${item.creators ? item.creators.join(", ") : ""}`;
}

function getItemPublicationDate(item: RefData): string {
  if (!item.date) {
    return "";
  }

  const dateString = item.date.split(" ")[0];
  const year = dateString.split("-")[0];
  let month = dateString.split("-")[1];
  if (month == "00" || month == "0") {
    month = "1";
  }
  let day = dateString.split("-")[2];
  if (day == "00" || day == "0") {
    day = "1";
  }

  return new Date(year, month, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatAuthors(item: RefData): string {
  switch (item.creators.length) {
    case 1:
      return `**Author:** ${item.creators[0]}`;
    case 2:
      return `**Authors:** ${item.creators[0]} and ${item.creators[1]}`;
    case 3:
      return `**Authors:** ${item.creators[0]}, ${item.creators[1]} and ${item.creators[2]}`;
    case 4:
      return `**Authors:** ${item.creators[0]}, ${item.creators[1]}, ${item.creators[2]} and ${item.creators[3]}`;
    default:
      return `**Authors:** ${item.creators[0]}, ${item.creators[1]}, ..., ${item.creators[item.creators.length - 1]}`;
  }
}

function getItemDoi(item: RefData): string {
  if (!item.DOI) {
    return "";
  } else {
    if (item.DOI.includes(" ")) {
      return item.DOI.split(" ")[1];
    } else if (item.DOI.includes("http://")) {
      return item.DOI.split("/").splice(3).join("/");
    } else if (item.DOI.includes("https://")) {
      return item.DOI.split("/").splice(3).join("/");
    } else {
      return item.DOI;
    }
  }
}

function getItemZotUrl(item: RefData): string {
  return `zotero://select/items/${item.library ? item.library : 0}_${item.key}`;
}

function getItemDetail(item: RefData): string {
  const title = item.title;
  const creators = item.creators;
  const publicationTitle = item.publicationTitle;
  const publicationDate = getItemPublicationDate(item);

  return `## [${title}](zotero://open-pdf/library/items/${item.attachment.key})

  ---

${creators ? formatAuthors(item) : ""}

${publicationTitle ? "**Publication:** " + publicationTitle : ""}

${publicationDate ? "**Publication Date:** " + publicationDate : ""}

${
  item.DOI
    ? "**DOI:** [" + getItemDoi(item) + "](" + "https://doi.org/" + getItemDoi(item) + ")"
    : item.url
    ? "**URL:** [" + item.url + "](" + item.url + ")"
    : item.attachment.url
    ? "**URL:** [" + item.attachment.url + "](" + item.attachment.url + ")"
    : ""
}

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
          <List.Section key={sectionIndex} title={sectionName} subtitle={`${queryResults[sectionIndex].length}`}>
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
                      icon={Icon.Link}
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

                    <ActionPanel.Section>
                      {getItemTitle(item) !== "" && <TitleCopyToClipboardAction itemTitle={getItemTitle(item)} />}
                      {getItemAuthors(item) !== "" && <AuthorsCopyToClipboardAction authors={getItemAuthors(item)} />}
                      {getItemZotUrl(item) && <ZoteroUrlCopyToClipboard zotUrl={getItemZotUrl(item)} />}
                      {getItemDoi(item) !== "" && <DoiCopyToClipboardAction itemDoi={getItemDoi(item)} />}
                    </ActionPanel.Section>
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

function TitleCopyToClipboardAction({ itemTitle }: { itemTitle: string }) {
  return (
    <CopyToClipboard
      content={itemTitle}
      icon={Icon.Clipboard}
      title="Copy Title to Clipboard"
      shortcut={copyTitleShortcut}
      message="Copied title to clipboard"
    />
  );
}
function AuthorsCopyToClipboardAction({ authors }: { authors: string }) {
  return (
    <CopyToClipboard
      content={authors}
      icon={Icon.Clipboard}
      title="Copy Authors to Clipboard"
      shortcut={copyAuthorsShortcut}
      message="Copied authors to clipboard"
    />
  );
}

function DoiCopyToClipboardAction({ itemDoi }: { itemDoi: string }) {
  return (
    <CopyToClipboard
      content={itemDoi}
      icon={Icon.Clipboard}
      title="Copy DOI to Clipboard"
      shortcut={copyDoiShortcut}
      message="Copied DOI to clipboard"
    />
  );
}

function ZoteroUrlCopyToClipboard({ zotUrl }: { zotUrl: string }) {
  return (
    <CopyToClipboard
      content={zotUrl}
      icon={Icon.Clipboard}
      title="Copy Zotero URL to Clipboard"
      shortcut={copyZoteroUrlShortcut}
      message="Copied Zotero URL to clipboard"
    />
  );
}

function RefPasteAction({ selected }: { selected: string }) {
  return (
    <Action
      title="Paste Reference to App"
      icon={Icon.Document}
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
      icon={Icon.Document}
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
