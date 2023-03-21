import { Color, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useState } from "react";
import { Note } from "./bear-db";
import { useBearDb } from "./hooks";
import NoteActions from "./note-actions";

export default function SearchNotes() {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [db, error] = useBearDb();
  const [notes, setNotes] = useState<Note[]>();

  useEffect(() => {
    if (db != null) {
      setNotes(db.getNotes(searchQuery));
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
      searchBarPlaceholder="Search note text or id ..."
      isShowingDetail={showDetail}
    >
      {notes?.map((note) => (
        <List.Item
          key={note.id}
          title={note.title === "" ? "Untitled Note" : note.encrypted ? "🔒 " + note.title : note.title}
          subtitle={showDetail ? undefined : note.formattedTags}
          icon={{ source: "command-icon.png" }}
          keywords={[note.id]}
          actions={<NoteActions isNotePreview={false} note={note} />}
          accessoryTitle={
            showDetail ? undefined : `edited ${formatDistanceToNowStrict(note.modifiedAt, { addSuffix: true })}`
          }
          detail={
            <List.Item.Detail
              markdown={note.encrypted ? "*This note's content is encrypted*" : note.text}
              metadata={<NoteMetadata note={note} />}
            />
          }
        />
      ))}
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
