import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  confirmAlert,
  showToast,
  Toast,
  Clipboard,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import {
  approveLesson,
  downloadLesson,
  formatDuration,
  lessonUrl,
  listLessons,
  openLesson,
  phaseLabel,
  toastFailure,
  type Lesson,
} from "./api";

const STATUS_ICON: Record<string, { source: Icon; tintColor: Color }> = {
  done: { source: Icon.CheckCircle, tintColor: Color.Green },
  rendering: { source: Icon.Clock, tintColor: Color.Blue },
  queued: { source: Icon.Hourglass, tintColor: Color.SecondaryText },
  failed: { source: Icon.XMarkCircle, tintColor: Color.Red },
};

export default function Lessons() {
  const [filter, setFilter] = useState<string>("all");
  const { data, isLoading, revalidate } = usePromise(() => listLessons(), []);

  const lessons = useMemo(() => {
    const all = data?.lessons ?? [];
    if (filter === "approval") return all.filter((l) => l.needs_approval);
    if (filter === "ready") return all.filter((l) => l.status === "done");
    if (filter === "active") return all.filter((l) => l.status === "queued" || l.status === "rendering");
    return all;
  }, [data, filter]);

  const approvalCount = (data?.lessons ?? []).filter((l) => l.needs_approval).length;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search your lessons by title"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter} value={filter}>
          <List.Dropdown.Item title="All lessons" value="all" />
          <List.Dropdown.Item
            title={`Waiting for approval${approvalCount ? ` (${approvalCount})` : ""}`}
            value="approval"
          />
          <List.Dropdown.Item title="Ready" value="ready" />
          <List.Dropdown.Item title="Rendering" value="active" />
        </List.Dropdown>
      }
    >
      {lessons.map((lesson) => (
        <List.Item
          key={lesson.id}
          icon={STATUS_ICON[lesson.status] ?? Icon.Document}
          title={lesson.title || "Untitled lesson"}
          subtitle={phaseLabel(lesson)}
          accessories={[
            lesson.format ? { tag: lesson.format } : {},
            lesson.duration_sec ? { text: formatDuration(lesson.duration_sec) } : {},
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action title="Open in Zıpır" icon={Icon.Globe} onAction={() => openLesson(lesson.id)} />
                {lesson.needs_approval ? <ApproveAction lesson={lesson} onDone={revalidate} /> : null}
                {lesson.status === "done" ? <DownloadAction lesson={lesson} /> : null}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard title="Copy Lesson Link" icon={Icon.Link} content={lessonUrl(lesson.id)} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
      <List.EmptyView
        icon={Icon.Video}
        title={lessons.length ? "No lesson matches this filter" : "No lessons yet"}
        description="Start one from New Lesson, or open app.zipirapp.com"
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Zıpır" url="https://app.zipirapp.com/islerim" />
          </ActionPanel>
        }
      />
    </List>
  );
}

function ApproveAction({ lesson, onDone }: { lesson: Lesson; onDone: () => void }) {
  return (
    <Action
      title="Approve Storyboard"
      icon={Icon.Checkmark}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
      onAction={async () => {
        const ok = await confirmAlert({
          title: "Approve the storyboard?",
          message: "Approval starts the render and the lesson's length counts against the account's video minutes.",
          primaryAction: { title: "Approve and Render" },
        });
        if (!ok) return;
        const toast = await showToast({ style: Toast.Style.Animated, title: "Approving" });
        try {
          await approveLesson(lesson.id);
          toast.style = Toast.Style.Success;
          toast.title = "Approved, rendering";
          onDone();
        } catch (error) {
          await toast.hide();
          toastFailure(error);
        }
      }}
    />
  );
}

function DownloadAction({ lesson }: { lesson: Lesson }) {
  return (
    <Action
      title="Copy Download Link"
      icon={Icon.Download}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={async () => {
        const toast = await showToast({ style: Toast.Style.Animated, title: "Getting the link" });
        try {
          const link = await downloadLesson(lesson.id);
          await Clipboard.copy(link.url);
          await toast.hide();
          await showToast({
            style: Toast.Style.Success,
            title: `${link.variant}p link copied`,
            message: `Valid for ${Math.round(link.expires_in / 60)} minutes`,
          });
        } catch (error) {
          await toast.hide();
          toastFailure(error);
        }
      }}
    />
  );
}
