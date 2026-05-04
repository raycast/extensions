import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { useLocalStorage, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { getActiveTab } from "./lib/browser";
import { CHANNEL_ID_PATTERN, resolveChannelIds } from "./lib/channels";
import { buildQuicklink, type ChannelPresetContext } from "./lib/deeplink";
import { useChannels } from "./lib/useChannels";
import { loadPreferences } from "./lib/preferences";
import { buildSlackText, postMessageToAll } from "./lib/slack";
import { DEFAULT_MESSAGE_TEMPLATE, MESSAGE_TEMPLATE_KEY } from "./lib/template";
import TemplateEditor from "./template-editor";

export default function Command(props: LaunchProps<{ launchContext: ChannelPresetContext }>) {
  const prefs = loadPreferences();
  const { data: tab, isLoading: isLoadingTab, error: tabError } = usePromise(getActiveTab);
  const { value: template, isLoading: isLoadingTemplate } = useLocalStorage<string>(
    MESSAGE_TEMPLATE_KEY,
    DEFAULT_MESSAGE_TEMPLATE,
  );
  const {
    channels,
    isLoading: isLoadingChannels,
    error: channelsError,
    revalidate: revalidateChannels,
  } = useChannels(prefs.slackBotToken);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const launchContextEntries = useMemo<string[]>(() => {
    const raw = props.launchContext?.channels;
    if (!Array.isArray(raw)) return [];
    return raw.filter((s): s is string => typeof s === "string");
  }, [props.launchContext]);

  const launchContextChannelIds = useMemo(
    () => resolveChannelIds(launchContextEntries, channels),
    [launchContextEntries, channels],
  );

  const defaultSelectedIds = useMemo(() => resolveChannelIds(prefs.defaultChannels, channels), [channels]);

  const initialSelectedIds = useMemo(
    () => (launchContextChannelIds.length > 0 ? launchContextChannelIds : defaultSelectedIds),
    [launchContextChannelIds, defaultSelectedIds],
  );

  useEffect(() => {
    if (tab?.title && title === "") {
      setTitle(tab.title);
    }
  }, [tab]);

  useEffect(() => {
    if (selected.length === 0 && initialSelectedIds.length > 0) {
      setSelected(initialSelectedIds);
    }
  }, [initialSelectedIds]);

  useEffect(() => {
    if (launchContextEntries.length === 0) return;
    if (channels.length === 0) return; // loading 中は判定保留
    if (launchContextChannelIds.length >= launchContextEntries.length) return;

    const isId = (s: string) => CHANNEL_ID_PATTERN.test(s);
    const unknown = launchContextEntries.filter((entry) =>
      isId(entry) ? !channels.some((c) => c.id === entry) : !channels.some((c) => c.name === entry),
    );
    if (unknown.length > 0) {
      showToast({
        style: Toast.Style.Failure,
        title: "Unknown channels in preset",
        message: unknown.join(", "),
      });
    }
  }, [launchContextEntries, launchContextChannelIds, channels]);

  const selectedChannelNames = useMemo(
    () => selected.map((id) => channels.find((c) => c.id === id)?.name).filter((n): n is string => Boolean(n)),
    [selected, channels],
  );

  const quicklinkSuggestedName = useMemo(() => {
    if (selectedChannelNames.length === 0) return undefined;
    const head = selectedChannelNames
      .slice(0, 3)
      .map((n) => `#${n}`)
      .join(", ");
    const suffix = selectedChannelNames.length > 3 ? ` +${selectedChannelNames.length - 3}` : "";
    return `Link Note → ${head}${suffix}`;
  }, [selectedChannelNames]);

  async function handleSubmit() {
    if (!tab) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No active tab",
        message: tabError?.message ?? "Active tab is still loading.",
      });
      return;
    }
    if (selected.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select at least one channel",
      });
      return;
    }

    setSubmitting(true);
    const text = buildSlackText({
      url: tab.url,
      title,
      comment,
      template: template ?? DEFAULT_MESSAGE_TEMPLATE,
    });
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Sending to ${selected.length} channel(s)…`,
    });

    const results = await postMessageToAll({
      token: prefs.slackBotToken,
      channels: selected,
      text,
    });
    setSubmitting(false);

    const failed = results.flatMap((r) => (r.ok ? [] : [r]));
    if (failed.length === 0) {
      toast.style = Toast.Style.Success;
      toast.title = `Sent to ${results.length} channel(s)`;
      await popToRoot();
      return;
    }
    toast.style = Toast.Style.Failure;
    toast.title = `${failed.length}/${results.length} failed`;
    toast.message = failed.map((f) => `#${f.channel}: ${f.error}`).join("\n");
  }

  return (
    <Form
      isLoading={isLoadingTab || submitting || isLoadingTemplate || (isLoadingChannels && channels.length === 0)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send to Slack" onSubmit={handleSubmit} />
          <Action.Push
            title="Edit Message Template"
            target={<TemplateEditor />}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            icon={Icon.Pencil}
          />
          {selected.length > 0 && (
            <Action.CreateQuicklink
              title="Save as Quicklink Preset"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              quicklink={{
                link: buildQuicklink("link-note", { channels: selected }),
                name: quicklinkSuggestedName,
              }}
            />
          )}
          <Action
            title="Refresh Channels"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidateChannels}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.Description title="URL" text={tab?.url ?? (isLoadingTab ? "Loading…" : "—")} />
      <Form.TextArea
        id="comment"
        title="Comment"
        placeholder="Optional note to include before the link"
        value={comment}
        onChange={setComment}
        autoFocus
      />
      {channelsError && (
        <Form.Description
          title="Channels"
          text={`Could not load channels: ${channelsError.message}. Press ⌘R to retry.`}
        />
      )}
      <Form.TagPicker id="channels" title="Channels" value={selected} onChange={setSelected}>
        {channels.map((c) => (
          <Form.TagPicker.Item key={c.id} value={c.id} title={`#${c.name}`} />
        ))}
      </Form.TagPicker>
    </Form>
  );
}
