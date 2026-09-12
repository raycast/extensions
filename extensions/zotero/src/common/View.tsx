import {
  ActionPanel,
  List,
  Icon,
  Action,
  Keyboard,
  Form,
  getPreferenceValues,
  Clipboard,
  closeMainWindow,
  showHUD,
  open,
  useNavigation,
} from "@raycast/api";
import { dirname, join } from "path";
import { RefData, Preferences, resolveHome, MAX_RENDER_RESULTS } from "./zoteroApi";
import { LibraryRef, itemIdentity, zoteroSelectUri, zoteroOpenPdfUri } from "./library";
import type { CollectionOption } from "./collections";
import { useVisitedUrls } from "./useVisitedUrls";
import {
  exportRef,
  exportRefPaste,
  exportBibtexRef,
  exportBibtexRefPaste,
  exportPandocKey,
  exportPandocKeyPaste,
} from "./clipboard";
import CollectionDropdown from "./CollectionDropdown";

type Props = {
  sectionNames: string[];
  collections: CollectionOption[];
  selectedCollection: string;
  onCollectionChange: (value: string) => void;
  groupLibraries: LibraryRef[];
  includedGroups: number[];
  onSaveGroups: (ids: number[]) => void;
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
const copyPandocShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "7" };
const pastePandocShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "8" };

const copyURLShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "." };
const copyPDFURLShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "p" };
const copyTitleShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "." };
const copyAuthorsShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "b" };
const copyZoteroUrlShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "c" };
const copyDoiShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "d" };
const copyPDFPathShortcut: Keyboard.Shortcut = { modifiers: ["cmd", "shift"], key: "," };

function resolveAttachmentPath(item: RefData, zoteroPath: string): string | null {
  if (!item.attachment?.path || !item.attachment?.key) return null;
  const attachmentPath = item.attachment.path;
  if (!attachmentPath.startsWith("storage:")) {
    return attachmentPath;
  }
  const filename = attachmentPath.slice("storage:".length);
  const expandedZoteroPath = resolveHome(zoteroPath);
  return join(dirname(expandedZoteroPath), "storage", item.attachment.key, filename);
}

function getURL(item: RefData): string {
  return `${
    item.url
      ? item.url
      : `${item.attachment?.url ? item.attachment.url : `${item.DOI ? "https://doi.org/" + item.DOI : ""}`}`
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
  return zoteroSelectUri(item);
}

function getItemIcon(item: RefData): string {
  switch (item.type) {
    case "book":
      return "book.png";
    case "bookSection":
      return "bookSection.png";
    case "journalArticle":
      return "journalArticle.png";
    case "thesis":
      return "thesis.png";
    case "blogPost":
      return "blogPost.png";
    case "conferencePaper":
      return "conferencePaper.png";
    case "document":
      return "document.png";
    case "preprint":
      return "preprint.png";
    case "patent":
      return "patent.png";
    default:
      return "default.png";
  }
}

function getItemDetail(item: RefData): string {
  const title = item.title;
  const creators = item.creators;
  const publicationTitle = item.publicationTitle;
  const publicationDate = getItemPublicationDate(item);
  const pdfKey = item.attachment?.key;

  return `## ${pdfKey ? `[${title}](${zoteroOpenPdfUri(item, pdfKey)})` : title}

  ---
${
  item.libraryType === "group" && item.libraryName
    ? `
**Library:** ${item.libraryName}
`
    : ""
}
${creators ? formatAuthors(item) : ""}

${publicationTitle ? "**Publication:** " + publicationTitle : ""}

${publicationDate ? "**Publication Date:** " + publicationDate : ""}

${
  item.DOI
    ? "**DOI:** [" + getItemDoi(item) + "](" + "https://doi.org/" + getItemDoi(item) + ")"
    : item.url
    ? "**URL:** [" + item.url + "](" + item.url + ")"
    : item.attachment?.url
    ? "**URL:** [" + item.attachment.url + "](" + item.attachment.url + ")"
    : ""
}

${item.abstractNote ? "**Abstract:** " + item.abstractNote : ""}

${item.tags ? "**Tagged With:** " + item.tags.join(", ") : ""}

${
  item.notes?.length
    ? `**Notes:**\n${item.notes
        .slice(0, 3)
        .map((note) => `- ${note.length > 280 ? note.slice(0, 277).trimEnd() + "..." : note}`)
        .join("\n")}`
    : ""
}

`;
}

export const View = ({
  sectionNames,
  collections,
  selectedCollection,
  onCollectionChange,
  groupLibraries,
  includedGroups,
  onSaveGroups,
  queryResults,
  isLoading,
  onSearchTextChange,
  throttle,
}: Props): JSX.Element => {
  const [urls, onOpen] = useVisitedUrls();
  const preferences: Preferences = getPreferenceValues();
  return (
    <List
      isShowingDetail={queryResults[0].length > 0}
      isLoading={isLoading}
      onSearchTextChange={(text) => {
        onSearchTextChange?.(text);
      }}
      throttle={throttle}
      searchBarPlaceholder="Search Zotero..."
      searchBarAccessory={
        <CollectionDropdown value={selectedCollection} onSelection={onCollectionChange} options={collections} />
      }
    >
      {sectionNames.map((sectionName, sectionIndex) => (
        <List.Section
          key={sectionIndex}
          title={sectionName}
          subtitle={
            queryResults[sectionIndex].length >= MAX_RENDER_RESULTS
              ? `Top ${MAX_RENDER_RESULTS} — refine your search to see more`
              : `${queryResults[sectionIndex].length}`
          }
        >
          {queryResults[sectionIndex].map((item) => {
            const attachmentFilePath = resolveAttachmentPath(item, preferences.zotero_path);
            return (
              <List.Item
                key={itemIdentity(item)}
                id={itemIdentity(item)}
                title={
                  item.title +
                  (item.libraryType === "group" && item.libraryName ? ` · ${item.libraryName}` : "") +
                  (urls.includes(item.url) ? " (visited)" : "")
                }
                icon={getItemIcon(item)}
                accessories={
                  item.libraryType === "group" && item.libraryName
                    ? [{ icon: Icon.TwoPeople, tooltip: item.libraryName }]
                    : undefined
                }
                detail={<List.Item.Detail markdown={getItemDetail(item)} />}
                actions={
                  <ActionPanel>
                    {item.attachment?.key && item.attachment.key !== `` && (
                      <Action.OpenInBrowser
                        icon={Icon.ArrowRightCircleFilled}
                        title="Open PDF"
                        url={zoteroOpenPdfUri(item, item.attachment.key)}
                        onOpen={onOpen}
                      />
                    )}
                    {item.attachment?.key && item.attachment.key !== `` && attachmentFilePath && (
                      <Action
                        icon={Icon.ArrowRightCircleFilled}
                        title="Open PDF in System Viewer"
                        onAction={async () => {
                          try {
                            await open(attachmentFilePath);
                            closeMainWindow();
                          } catch {
                            await showHUD("Failed to open attachment");
                          }
                        }}
                      />
                    )}
                    <Action.OpenInBrowser
                      icon={Icon.Link}
                      title="Open in Zotero"
                      url={zoteroSelectUri(item)}
                      onOpen={onOpen}
                    />
                    {getURL(item) !== "" && (
                      <Action.OpenInBrowser
                        title="Open Original Link"
                        url={getURL(item)}
                        shortcut={openExtLinkCommandShortcut}
                        onOpen={onOpen}
                      />
                    )}

                    {preferences.use_bibtex && item.citekey && (
                      <Action.CopyToClipboard
                        title="Copy Bibtex Citation Key"
                        content={item.citekey}
                        shortcut={copyRefCommandShortcut}
                      />
                    )}
                    {preferences.use_bibtex && item.citekey && <RefCopyToClipboardAction selected={item.citekey} />}
                    {preferences.use_bibtex && item.citekey && <BibCopyToClipboardAction selected={item.citekey} />}
                    {preferences.use_bibtex && item.citekey && <PandocCopyAction selected={item.citekey} />}
                    {preferences.use_bibtex && item.citekey && <RefPasteAction selected={item.citekey} />}
                    {preferences.use_bibtex && item.citekey && <BibPasteAction selected={item.citekey} />}
                    {preferences.use_bibtex && item.citekey && <PandocPasteAction selected={item.citekey} />}

                    <ActionPanel.Section>
                      {item.attachment && item.attachment.key && item.attachment.key !== `` && (
                        <PDFURLCopyToClipboardAction itemURL={zoteroOpenPdfUri(item, item.attachment.key)} />
                      )}
                      {getURL(item) !== "" && <URLCopyToClipboardAction itemURL={getURL(item)} />}
                      {getItemTitle(item) !== "" && <TitleCopyToClipboardAction itemTitle={getItemTitle(item)} />}
                      {getItemAuthors(item) !== "" && <AuthorsCopyToClipboardAction authors={getItemAuthors(item)} />}
                      {getItemZotUrl(item) && <ZoteroUrlCopyToClipboard zotUrl={getItemZotUrl(item)} />}
                      {getItemDoi(item) !== "" && <DoiCopyToClipboardAction itemDoi={getItemDoi(item)} />}
                      {attachmentFilePath && (
                        <PDFPathCopyToClipboardAction
                          pdfPath={preferences.quote_pdf_path ? `"${attachmentFilePath}"` : attachmentFilePath}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <ConfigureGroupLibrariesAction
                        groupLibraries={groupLibraries}
                        includedGroups={includedGroups}
                        onSave={onSaveGroups}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
};

const configureGroupsShortcut: Keyboard.Shortcut = { modifiers: ["cmd"], key: "l" };

function ConfigureGroupLibrariesAction({
  groupLibraries,
  includedGroups,
  onSave,
}: {
  groupLibraries: LibraryRef[];
  includedGroups: number[];
  onSave: (ids: number[]) => void;
}) {
  const { push } = useNavigation();
  if (groupLibraries.length === 0) {
    return null;
  }
  return (
    <Action
      icon={Icon.TwoPeople}
      title="Configure Group Libraries"
      shortcut={configureGroupsShortcut}
      onAction={() =>
        push(<GroupLibrariesForm groupLibraries={groupLibraries} includedGroups={includedGroups} onSave={onSave} />)
      }
    />
  );
}

function GroupLibrariesForm({
  groupLibraries,
  includedGroups,
  onSave,
}: {
  groupLibraries: LibraryRef[];
  includedGroups: number[];
  onSave: (ids: number[]) => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={(values: { groups: string[] }) => {
              onSave((values.groups ?? []).map(Number).filter((n) => !Number.isNaN(n)));
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose which group libraries to include in search. Your personal library is always searched; group libraries are opt-in." />
      <Form.TagPicker id="groups" title="Group Libraries" defaultValue={includedGroups.map(String)}>
        {groupLibraries.map((l) => (
          <Form.TagPicker.Item key={l.id} value={String(l.id)} title={l.name} icon={Icon.TwoPeople} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}

function URLCopyToClipboardAction({ itemURL }: { itemURL: string }) {
  return (
    <CopyToClipboard
      content={itemURL}
      icon={Icon.Clipboard}
      title="Copy Original Link"
      shortcut={copyURLShortcut}
      message="Copied original URL to clipboard"
    />
  );
}

function PDFURLCopyToClipboardAction({ itemURL }: { itemURL: string }) {
  return (
    <CopyToClipboard
      content={itemURL}
      icon={Icon.Clipboard}
      title="Copy PDF Link"
      shortcut={copyPDFURLShortcut}
      message="Copied PDF URL to clipboard"
    />
  );
}

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

function PDFPathCopyToClipboardAction({ pdfPath }: { pdfPath: string }) {
  return (
    <CopyToClipboard
      content={pdfPath}
      icon={Icon.Clipboard}
      title="Copy PDF Path"
      shortcut={copyPDFPathShortcut}
      message="Copied PDF path to clipboard"
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

function PandocCopyAction({ selected }: { selected: string }) {
  return (
    <Action
      title="Copy Pandoc Citation Key"
      icon={Icon.Clipboard}
      shortcut={copyPandocShortcut}
      onAction={() => exportPandocKey(selected)}
    />
  );
}

function PandocPasteAction({ selected }: { selected: string }) {
  return (
    <Action
      title="Paste Pandoc Citation Key to App"
      icon={Icon.Document}
      shortcut={pastePandocShortcut}
      onAction={() => exportPandocKeyPaste(selected)}
    />
  );
}
