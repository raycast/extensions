import { Action, ActionPanel, Keyboard, Icon } from "@raycast/api";
import { type Briefing, isUnread } from "../lib/model";
import { briefingMarkdown } from "../lib/markdown";
import { useZeroWire } from "../lib/use-zero-wire";

export function BriefingActions({
  briefing: b,
  detail = false,
  children,
}: {
  briefing: Briefing;
  detail?: boolean;
  children?: React.ReactNode;
}) {
  const store = useZeroWire();
  const unread = store.db ? isUnread(b, store.db) : true;
  return (
    <ActionPanel>
      {children}
      <Action.OpenInBrowser title="Open Original Briefing" url={b.url} />
      <Action.CopyToClipboard
        title="Copy Briefing URL"
        content={b.url}
        shortcut={
          detail ? undefined : { macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }
        }
      />
      <ActionPanel.Section title="Local review state">
        <Action
          title={store.db?.bookmarks[b.id] ? "Remove Bookmark" : "Bookmark Briefing"}
          icon={Icon.Bookmark}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={() => store.toggleBookmark(b)}
        />
        <Action
          title={unread ? "Mark Revision Reviewed" : "Mark Unread"}
          icon={unread ? Icon.Checkmark : Icon.Circle}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "m" }, Windows: { modifiers: ["ctrl"], key: "m" } }}
          onAction={() => store.review(b, unread)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy source content">
        {b.cves.length > 0 && <Action.CopyToClipboard title="Copy All CVEs" content={b.cves.join("\n")} />}
        <Action.CopyToClipboard title="Copy Attributed Markdown Brief" content={briefingMarkdown(b)} />
        {b.assessmentPrompt ? (
          <Action.CopyToClipboard title="Copy Assessment Prompt" content={b.assessmentPrompt} />
        ) : (
          <Action.OpenInBrowser title="View Assessment Prompt on Source" url={b.url} />
        )}
      </ActionPanel.Section>
      {b.evidence.length > 0 && (
        <ActionPanel.Submenu title="Open Evidence" icon={Icon.Link}>
          {b.evidence.map((link, index) => (
            <Action.OpenInBrowser key={`${link.url}-${index}`} title={link.title} url={link.url} />
          ))}
        </ActionPanel.Submenu>
      )}
      {b.tags.length > 0 && (
        <ActionPanel.Submenu title="Follow Technologies" icon={Icon.Tag}>
          {b.tags.map((tag) => (
            <Action
              key={tag.id}
              title={`${store.db && tag.id in store.db.followed ? "Unfollow" : "Follow"} ${tag.name}`}
              onAction={() => store.toggleFollow(tag)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      <ActionPanel.Section>
        {detail && (
          <Action
            title="Refresh This Briefing"
            icon={Icon.ArrowClockwise}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "r" },
              Windows: { modifiers: ["ctrl", "shift"], key: "r" },
            }}
            onAction={() => store.loadDetail(b, true)}
          />
        )}
        <Action
          title="Refresh Briefings"
          icon={Icon.ArrowClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={store.refresh}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
