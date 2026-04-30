import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import {
  absoluteNotePath,
  cliSetupCopyActionContent,
  execZen,
  loadVaultRoot,
  openNoteInFloatingWindow,
  openNoteInZenNotes,
  parseNote,
  parseNoteList,
  toLoadError,
  type LoadError,
  type NoteFolder,
  type ZenNote,
} from "./lib/zen";

const NOTE_LIMIT = 2000;
const FOLDER_FILTERS: Array<{
  folder: Exclude<NoteFolder, "trash">;
  title: string;
}> = [
  { folder: "inbox", title: "Inbox" },
  { folder: "quick", title: "Quick Notes" },
  { folder: "archive", title: "Archive" },
];

type FilterValue =
  | "all"
  | `folder:${Exclude<NoteFolder, "trash">}`
  | `tag:${string}`;

export default function SearchNotes(): ReactElement {
  const [notes, setNotes] = useState<ZenNote[]>([]);
  const [vaultRoot, setVaultRoot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const nextNotes = await loadNotes();
      const nextVaultRoot = await loadVaultRoot().catch(() => null);
      setNotes(nextNotes);
      setVaultRoot(nextVaultRoot);
    } catch (err) {
      setNotes([]);
      setVaultRoot(null);
      setError(toLoadError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const emptyView = useMemo(() => {
    if (!error) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No notes found"
          description="ZenNotes returned no notes for this vault."
          actions={<RefreshActions onRefresh={load} />}
        />
      );
    }

    return (
      <List.EmptyView
        icon={Icon.Warning}
        title={error.title}
        description={error.message}
        actions={<ErrorActions onRefresh={load} />}
      />
    );
  }, [error, load]);

  const filteredNotes = useMemo(
    () => filterNotes(notes, filter),
    [filter, notes],
  );
  const availableTags = useMemo(() => collectTags(notes), [notes]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search ZenNotes notes by title, path, or tag..."
      searchBarAccessory={
        <NoteFilterDropdown
          value={filter}
          tags={availableTags}
          onChange={(next) => setFilter(next as FilterValue)}
        />
      }
    >
      {error || filteredNotes.length === 0
        ? emptyView
        : filteredNotes.map((note) => (
            <List.Item
              key={note.path}
              title={note.title}
              subtitle={note.path}
              icon={Icon.Document}
              keywords={noteKeywords(note)}
              accessories={noteAccessories(note)}
              actions={
                <NoteActions
                  note={note}
                  vaultRoot={vaultRoot}
                  onDelete={(path) =>
                    setNotes((current) =>
                      current.filter((entry) => entry.path !== path),
                    )
                  }
                  onUpdate={(oldPath, updatedNote) =>
                    setNotes((current) =>
                      sortNotes([
                        ...current.filter(
                          (entry) =>
                            entry.path !== oldPath &&
                            entry.path !== updatedNote.path,
                        ),
                        updatedNote,
                      ]),
                    )
                  }
                  onRefresh={load}
                />
              }
            />
          ))}
    </List>
  );
}

function NoteFilterDropdown({
  value,
  tags,
  onChange,
}: {
  value: FilterValue;
  tags: string[];
  onChange: (value: string) => void;
}): ReactElement {
  return (
    <List.Dropdown tooltip="Filter Notes" value={value} onChange={onChange}>
      <List.Dropdown.Section title="Folders">
        <List.Dropdown.Item title="All Notes" value="all" />
        {FOLDER_FILTERS.map(({ folder, title }) => (
          <List.Dropdown.Item
            key={folder}
            title={title}
            value={`folder:${folder}`}
          />
        ))}
      </List.Dropdown.Section>
      {tags.length > 0 ? (
        <List.Dropdown.Section title="Tags">
          {tags.map((tag) => (
            <List.Dropdown.Item
              key={tag}
              title={`#${tag}`}
              value={`tag:${tag}`}
            />
          ))}
        </List.Dropdown.Section>
      ) : null}
    </List.Dropdown>
  );
}

function RefreshActions({
  onRefresh,
}: {
  onRefresh: () => Promise<void>;
}): ReactElement {
  return (
    <ActionPanel>
      <Action
        title="Refresh Notes"
        icon={Icon.ArrowClockwise}
        onAction={() => void onRefresh()}
      />
    </ActionPanel>
  );
}

function ErrorActions({
  onRefresh,
}: {
  onRefresh: () => Promise<void>;
}): ReactElement {
  return (
    <ActionPanel>
      <Action
        title="Refresh Notes"
        icon={Icon.ArrowClockwise}
        onAction={() => void onRefresh()}
      />
      <Action.CopyToClipboard
        title="Copy CLI Setup Hint"
        content={cliSetupCopyActionContent()}
      />
    </ActionPanel>
  );
}

function NoteActions({
  note,
  vaultRoot,
  onDelete,
  onUpdate,
  onRefresh,
}: {
  note: ZenNote;
  vaultRoot: string | null;
  onDelete: (path: string) => void;
  onUpdate: (oldPath: string, updatedNote: ZenNote) => void;
  onRefresh: () => Promise<void>;
}): ReactElement {
  const noteAbsPath = absoluteNotePath(vaultRoot, note.path);

  return (
    <ActionPanel>
      <Action
        title="Open in ZenNotes"
        icon={Icon.ArrowRight}
        onAction={() => void openNoteInZenNotes(note)}
      />
      <Action
        title="Open in Floating Window"
        icon={Icon.AppWindow}
        shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
        onAction={() => void openNoteInFloatingWindow(note)}
      />
      {noteAbsPath ? <Action.ShowInFinder path={noteAbsPath} /> : null}
      <Action.CopyToClipboard title="Copy Note Path" content={note.path} />
      <Action.CopyToClipboard
        title="Copy Wikilink"
        content={`[[${note.title}]]`}
      />
      <ActionPanel.Section title="Manage">
        {note.folder === "archive" ? (
          <Action
            title="Unarchive Note"
            icon={Icon.ArrowCounterClockwise}
            onAction={() =>
              void updateNoteArchiveState(note, "unarchive", onUpdate)
            }
          />
        ) : (
          <Action
            title="Archive Note"
            icon={Icon.Box}
            onAction={() =>
              void updateNoteArchiveState(note, "archive", onUpdate)
            }
          />
        )}
        <Action
          title="Move to Trash"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={() => void moveNoteToTrash(note, onDelete)}
        />
      </ActionPanel.Section>
      <Action
        title="Refresh Notes"
        icon={Icon.ArrowClockwise}
        onAction={() => void onRefresh()}
      />
    </ActionPanel>
  );
}

async function loadNotes(): Promise<ZenNote[]> {
  const { stdout } = await execZen([
    "list",
    "--json",
    "--limit",
    String(NOTE_LIMIT),
  ]);
  return parseNoteList(String(stdout));
}

async function updateNoteArchiveState(
  note: ZenNote,
  action: "archive" | "unarchive",
  onUpdate: (oldPath: string, updatedNote: ZenNote) => void,
): Promise<void> {
  const verb = action === "archive" ? "Archiving" : "Unarchiving";
  const done = action === "archive" ? "Archived" : "Unarchived";
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${verb} note`,
    message: note.title,
  });

  try {
    const { stdout } = await execZen([action, note.path, "--json"]);
    const updatedNote = parseNote(JSON.parse(String(stdout)) as unknown);
    if (!updatedNote)
      throw new Error(`Expected \`zen ${action} --json\` to return a note.`);
    onUpdate(note.path, updatedNote);
    toast.style = Toast.Style.Success;
    toast.title = `${done} note`;
    toast.message = updatedNote.title;
  } catch (err) {
    const loadError = toLoadError(err);
    toast.style = Toast.Style.Failure;
    toast.title = loadError.title;
    toast.message = loadError.message;
  }
}

async function moveNoteToTrash(
  note: ZenNote,
  onDelete: (path: string) => void,
): Promise<void> {
  const confirmed = await confirmAlert({
    title: `Move "${note.title}" to Trash?`,
    message: note.path,
    primaryAction: {
      title: "Move to Trash",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Moving note to Trash",
    message: note.title,
  });

  try {
    await execZen(["trash", note.path, "--json"]);
    onDelete(note.path);
    toast.style = Toast.Style.Success;
    toast.title = "Moved to Trash";
    toast.message = note.title;
  } catch (err) {
    const loadError = toLoadError(err);
    toast.style = Toast.Style.Failure;
    toast.title = loadError.title;
    toast.message = loadError.message;
  }
}

function noteKeywords(note: ZenNote): string[] {
  return [note.path, note.folder, ...note.tags.map((tag) => `#${tag}`)];
}

function filterNotes(notes: ZenNote[], filter: FilterValue): ZenNote[] {
  if (filter === "all") return notes;
  if (filter.startsWith("folder:")) {
    const folder = filter.slice("folder:".length) as NoteFolder;
    return notes.filter((note) => note.folder === folder);
  }
  const tag = filter.slice("tag:".length).toLowerCase();
  return notes.filter((note) =>
    note.tags.some((candidate) => candidate.toLowerCase() === tag),
  );
}

function collectTags(notes: ZenNote[]): string[] {
  const tags = new Map<string, string>();
  for (const note of notes) {
    for (const tag of note.tags) {
      const normalized = tag.trim().replace(/^#/, "");
      if (!normalized) continue;
      tags.set(normalized.toLowerCase(), normalized);
    }
  }
  return Array.from(tags.values()).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" }),
  );
}

function sortNotes(notes: ZenNote[]): ZenNote[] {
  return [...notes].sort(
    (a, b) =>
      b.updatedAt - a.updatedAt ||
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
  );
}

function noteAccessories(note: ZenNote): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [
    { text: note.folder },
    { text: formatRelativeAge(note.updatedAt) },
  ];

  if (note.hasAttachments) {
    accessories.splice(1, 0, {
      icon: { source: Icon.Paperclip, tintColor: Color.SecondaryText },
      tooltip: "Has attachments",
    });
  }

  for (const tag of note.tags.slice(0, 2)) {
    accessories.splice(accessories.length - 1, 0, {
      tag: { value: `#${tag}`, color: Color.SecondaryText },
    });
  }

  return accessories;
}

function formatRelativeAge(updatedAt: number): string {
  if (!updatedAt) return "";
  const diff = Date.now() - updatedAt;
  if (diff < 0) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}
