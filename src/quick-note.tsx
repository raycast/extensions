import { Action, ActionPanel, Form, Icon, Toast, popToRoot, showToast } from "@raycast/api";
import type { LaunchProps } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { resolveChannelIds } from "./lib/channels";
import { useChannels } from "./lib/useChannels";
import { loadPreferences } from "./lib/preferences";
import { postMessageToAll } from "./lib/slack";
import { buildQuicklink, type ChannelPresetContext } from "./lib/deeplink";

export default function Command(props: LaunchProps<{ launchContext: ChannelPresetContext }>) {
  const prefs = loadPreferences();
  const {
    channels,
    isLoading: isLoadingChannels,
    error: channelsError,
    revalidate: revalidateChannels,
  } = useChannels(prefs.slackBotToken);
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

  const defaultSelectedIds = useMemo(() => resolveChannelIds(prefs.quickNoteDefaultChannels, channels), [channels]);

  const initialSelectedIds = useMemo(
    () => (launchContextChannelIds.length > 0 ? launchContextChannelIds : defaultSelectedIds),
    [launchContextChannelIds, defaultSelectedIds],
  );

  useEffect(() => {
    if (selected.length === 0 && initialSelectedIds.length > 0) {
      setSelected(initialSelectedIds);
    }
  }, [initialSelectedIds]);

  useEffect(() => {
    if (launchContextEntries.length === 0) return;
    if (channels.length === 0) return; // loading 中は判定保留
    if (launchContextChannelIds.length >= launchContextEntries.length) return;

    const isId = (s: string) => /^[CG][A-Z0-9]{8,}$/.test(s);
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
    return `Quick Note → ${head}${suffix}`;
  }, [selectedChannelNames]);

  async function handleSubmit() {
    if (comment.trim() === "") {
      await showToast({
        style: Toast.Style.Failure,
        title: "Comment is required",
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
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Sending to ${selected.length} channel(s)…`,
    });

    const results = await postMessageToAll({
      token: prefs.slackBotToken,
      channels: selected,
      text: comment,
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
      isLoading={submitting || (isLoadingChannels && channels.length === 0)}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send to Slack" onSubmit={handleSubmit} />
          {selected.length > 0 && (
            <Action.CreateQuicklink
              title="Save as Quicklink Preset"
              icon={Icon.Link}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              quicklink={{
                link: buildQuicklink("quick-note", { channels: selected }),
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
      <Form.TextArea id="comment" title="Comment" placeholder="Your note" value={comment} onChange={setComment} />
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
