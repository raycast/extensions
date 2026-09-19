import { Action, ActionPanel, Clipboard, Form, Icon, Toast, showHUD, showInFinder, showToast } from "@raycast/api";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { useEffect, useRef, useState } from "react";
import {
  formatTranscript,
  getTranscript,
  getYouTubeVideoId,
  transcriptFilename,
  type TranscriptFormat,
  type VideoTranscript,
} from "./transcript";

type TranscriptState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; transcript: VideoTranscript }
  | { kind: "error"; message: string };

const OUTPUTS = ["clipboard", "txt", "markdown", "vtt"] as const;
type Output = (typeof OUTPUTS)[number];

type FormValues = { output: Output };

function isOutput(value: string): value is Output {
  return OUTPUTS.some((output) => output === value);
}

export default function Command() {
  const [url, setUrl] = useState("");
  const [output, setOutput] = useState<Output>("clipboard");
  const [state, setState] = useState<TranscriptState>({ kind: "idle" });
  const cache = useRef(new Map<string, VideoTranscript>());
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = ++requestId.current;
    const value = url.trim();
    if (!value) {
      setState({ kind: "idle" });
      return;
    }

    const videoId = getYouTubeVideoId(value);
    setState(videoId ? { kind: "loading" } : { kind: "idle" });
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      if (!videoId) {
        setState({ kind: "error", message: "Enter a valid YouTube video URL." });
        return;
      }

      const cached = cache.current.get(videoId);
      if (cached) {
        if (requestId.current === currentRequestId) setState({ kind: "ready", transcript: cached });
        return;
      }
      try {
        const transcript = await getTranscript(value, { signal: controller.signal });
        if (requestId.current !== currentRequestId) return;
        cache.current.set(videoId, transcript);
        setState({ kind: "ready", transcript });
      } catch (error) {
        if (controller.signal.aborted || requestId.current !== currentRequestId) return;
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : "Could not get this transcript.",
        });
      }
    }, 400);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [url]);

  async function handleOutput({ output: selectedOutput }: FormValues) {
    if (state.kind !== "ready") return;

    if (selectedOutput === "clipboard") {
      try {
        const transcript = formatTranscript(state.transcript.segments);
        await Clipboard.copy(transcript.content);
        await showHUD("Transcript copied");
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Could not copy transcript",
          message: error instanceof Error ? error.message : "Try again.",
        });
      }
      return;
    }

    const format: TranscriptFormat = selectedOutput === "txt" ? "text" : selectedOutput;
    const transcript = formatTranscript(state.transcript.segments, format, state.transcript.title);
    try {
      const downloadsDirectory = join(homedir(), "Downloads");
      const filePath = join(downloadsDirectory, transcriptFilename(state.transcript.title, transcript.extension));
      await mkdir(downloadsDirectory, { recursive: true });
      await writeFile(filePath, `${transcript.content}\n`, { encoding: "utf8", flag: "wx" });
      await showToast({ style: Toast.Style.Success, title: "Transcript saved", message: filePath });
      await showInFinder(filePath).catch(() => undefined);
    } catch (error) {
      const message =
        error instanceof Error && "code" in error && error.code === "EEXIST"
          ? "A transcript with this name is already in Downloads."
          : error instanceof Error
            ? error.message
            : "Try again.";
      await showToast({ style: Toast.Style.Failure, title: "Could not save transcript", message });
    }
  }

  const actions =
    state.kind === "ready" ? (
      <ActionPanel>
        <Action.SubmitForm
          title={output === "clipboard" ? "Copy to Clipboard" : "Save Transcript"}
          icon={output === "clipboard" ? Icon.Clipboard : Icon.SaveDocument}
          onSubmit={handleOutput}
        />
      </ActionPanel>
    ) : undefined;

  return (
    <Form isLoading={state.kind === "loading"} actions={actions}>
      <Form.TextField
        id="url"
        title="URL"
        placeholder="https://www.youtube.com/watch?v=..."
        value={url}
        error={state.kind === "error" ? state.message : undefined}
        autoFocus
        onChange={setUrl}
      />
      <Form.Description title="Title" text={state.kind === "ready" ? state.transcript.title : "—"} />
      {state.kind === "ready" ? (
        <Form.Dropdown
          id="output"
          title="Output"
          value={output}
          onChange={(value) => {
            if (isOutput(value)) setOutput(value);
          }}
        >
          <Form.Dropdown.Item value="clipboard" title="Copy to Clipboard" />
          <Form.Dropdown.Item value="txt" title="Text File (.txt)" />
          <Form.Dropdown.Item value="markdown" title="Markdown (.md)" />
          <Form.Dropdown.Item value="vtt" title="WebVTT (.vtt)" />
        </Form.Dropdown>
      ) : null}
    </Form>
  );
}
