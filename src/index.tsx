import {
  Action,
  ActionPanel,
  Color,
  getPreferenceValues,
  LaunchProps,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "react";
import { Note } from "./bear-db";
import { useBearDb } from "./hooks";
import NoteActions from "./note-actions";

interface SearchNotesArguments {
  searchQuery?: string;
}
export default function SearchNotes(props: LaunchProps<{ arguments: SearchNotesArguments }>) {
  const { searchQuery: initialSearchQuery } = props.arguments;
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery ?? "");
  const [db, error] = useBearDb();
  const [searchError, setSearchError] = useState<Error>();
  const [notes, setNotes] = useState<Note[]>();

  useEffect(() => {
    if (db != null) {
      try {
        const notes = db.getNotes(searchQuery);
        setNotes(notes);
      } catch (error) {
        if (error instanceof Error) {
          setSearchError(error);
        } else {
          throw error;
        }
        setNotes([]);
      }
    }
  }, [db, searchQuery]);

  if (error) {
    showToast(Toast.Style.Failure, "Something went wrong", error.message);
  }

  const showDetail = (notes ?? []).length > 0 && getPreferenceValues().showPreviewInListView;

  return (
    <List
      isLoading={notes == undefined}
      onSearchTextChange={setSearchQuery}
      searchText={searchQuery}
      searchBarPlaceholder="Search note text or id ..."
      isShowingDetail={showDetail}
      throttle={true}
    >
      {notes?.length === 0 ? (
        <EmptyView searchError={searchError} />
      ) : (
        notes?.map((note) => (
          <List.Item
            key={note.id}
            title={note.title === "" ? "Untitled Note" : note.encrypted ? "🔒 " + note.title : note.title}
            subtitle={showDetail ? undefined : note.formattedTags}
            icon={{ source: "command-icon.png" }}
            keywords={[note.id]}
            actions={<NoteActions isNotePreview={false} note={note} />}
            accessories={
              showDetail
                ? undefined
                : [
                    {
                      date: note.modifiedAt,
                      tooltip: `Last modified ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}`,
                    },
                  ]
            }
            detail={
              <List.Item.Detail
                markdown={note.encrypted ? "*This note's content is encrypted*" : note.text}
                metadata={<NoteMetadata note={note} />}
              />
            }
          />
        ))
      )}
    </List>
  );
}

function NoteMetadata({ note }: { note: Note }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.TagList title="Tags">
        {note.tags.length === 0 ? (
          <List.Item.Detail.Metadata.TagList.Item text="Untagged" />
        ) : (
          note.tags.map((tag) => <List.Item.Detail.Metadata.TagList.Item text={tag} key={tag} color={Color.Yellow} />)
        )}
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label
        title="Last modified"
        text={formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}
      />
      <List.Item.Detail.Metadata.Label
        title="Created"
        text={formatDistanceToNowStrict(note.createdAt, { addSuffix: true })}
      />
      <List.Item.Detail.Metadata.Label title="Word count" text={`${note.wordCount} words`} />
    </List.Item.Detail.Metadata>
  );
}

function EmptyView({ searchError }: { searchError: Error | undefined }) {
  if (searchError == undefined) return <List.EmptyView />;
  if (!searchError.message.startsWith("no such table")) throw searchError;

  if (searchError.message.includes("Z_7TAGS")) {
    return (
      <List.EmptyView
        title="Error Searching Notes"
        description="If you're using version 2 of Bear, you might need to update which Bear version you're using in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  } else if (searchError.message.includes("Z_5TAGS")) {
    return (
      <List.EmptyView
        title="Error Searching Notes"
        description="If you're using version 1 of Bear, you might need to update which Bear version you're using in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  } else {
    throw searchError;
  }
}
