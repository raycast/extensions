import { useCallback, useEffect, useState } from "react";
import { stat } from "node:fs/promises";
import { basename, extname } from "node:path";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  closeMainWindow,
  confirmAlert,
  getSelectedFinderItems,
  openExtensionPreferences,
  showToast,
  environment,
  Image,
  useNavigation,
  type Application,
} from "@raycast/api";
import {
  FOLDER_NOT_RENAMED,
  FileTooLargeError,
  UnsupportedFileError,
  isSupportedFile,
  readAnalysisContent,
} from "./lib/content";
import { InvalidApiKeyError, RetryableProviderError, generateTitle, withProviderRetry } from "./lib/gemini";
import { buildFilename, renameFile } from "./lib/filename";
import { LIMITS } from "./lib/limits";
import { preferences } from "./lib/preferences";
import { previewUrl } from "./lib/preview";
import { ZUSH_WEBSITE, withZushUtm, zushAppHandles } from "./lib/zush";
import { findZushApp, openInZush } from "./lib/zush-app";
import type { ItemStatus, RenameItem } from "./lib/types";

export default function Command() {
  const [items, setItems] = useState<RenameItem[] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // A generated title is often longer than the row, and the row truncates it.
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const { push } = useNavigation();
  const zushApp = useZushApp();

  const hasApiKey = preferences().apiKey.length > 0;

  const updateItem = useCallback((path: string, patch: Partial<RenameItem>) => {
    setItems((current) => current?.map((item) => (item.path === path ? { ...item, ...patch } : item)) ?? current);
  }, []);

  const analyze = useCallback(
    async (targets: RenameItem[]) => {
      if (targets.length === 0) return;
      setIsAnalyzing(true);

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: progressTitle("Reading", 0, targets.length),
      });
      let done = 0;
      let failed = 0;
      // One key covers the batch, so a rejected key stops the queue instead of
      // spending a request per file on the same answer.
      let keyRejected = false;

      try {
        await runWithConcurrency(targets, LIMITS.maxParallelRequests, async (item) => {
          if (keyRejected) return;
          updateItem(item.path, { status: "analyzing", error: null });
          try {
            const content = await readAnalysisContent(item.path);
            // A batch is long enough to walk into a rate limit partway through,
            // and asking someone to press ⌘R on file after file for a wait that
            // resolves itself is not a decision worth handing them. Only the
            // generation is retried; reading the file is not going to change.
            const title = await withProviderRetry(() => generateTitle(preferences(), item.originalName, content));
            updateItem(item.path, { status: "ready", proposedTitle: title, generationCount: 1 });
          } catch (error) {
            if (error instanceof InvalidApiKeyError) keyRejected = true;
            failed += 1;
            updateItem(item.path, failurePatch(error));
          } finally {
            done += 1;
            toast.title = progressTitle("Reading", done, targets.length);
          }
        });

        if (keyRejected) {
          // The queue stopped early, so the files it never reached are still
          // sitting at "Queued" — a promise of work that is not coming. They
          // failed for the same reason as the ones that did get a request.
          setItems(
            (current) =>
              current?.map((item) =>
                item.status === "pending" ? { ...item, status: "failed", error: REJECTED_KEY } : item,
              ) ?? current,
          );

          toast.style = Toast.Style.Failure;
          toast.title = REJECTED_KEY;
          toast.message = "Nothing was renamed. Check the key in the extension preferences.";
          toast.primaryAction = {
            title: "Open Extension Preferences",
            onAction: () => openExtensionPreferences(),
          };
          return;
        }

        const succeeded = targets.length - failed;
        toast.style = failed === 0 ? Toast.Style.Success : Toast.Style.Failure;
        toast.title =
          failed === 0
            ? `${succeeded} ${succeeded === 1 ? "title" : "titles"} ready`
            : `${succeeded} of ${targets.length} ready`;
        toast.message = failed === 0 ? "Review, then rename." : `${failed} could not be read.`;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [updateItem],
  );

  const load = useCallback(
    async (paths: string[]) => {
      // One path twice would draw two rows sharing a React key, and renaming
      // either would leave the other pointing at a name that no longer exists.
      const unique = [...new Set(paths)];
      const accepted = unique.slice(0, LIMITS.maxFiles);
      const folders = await folderPaths(accepted);

      const targets = accepted.map((path): RenameItem => {
        const rejection = loadRejection(path, folders.has(path));
        return {
          path,
          originalName: basename(path),
          renamedTo: null,
          proposedTitle: null,
          status: rejection === null ? "pending" : "unsupported",
          generationCount: 0,
          error: rejection,
        };
      });
      setItems(targets);

      if (unique.length > accepted.length) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Only the first ${LIMITS.maxFiles} files were kept`,
          message: `${unique.length} files were selected.`,
        });
      }

      await analyze(targets.filter((item) => item.status === "pending"));
    },
    [analyze],
  );

  useEffect(() => {
    // Reading the selection would only lead to a wall of failed requests.
    if (!hasApiKey) return;

    let cancelled = false;
    (async () => {
      const paths = await selectedFinderPaths();
      if (cancelled) return;
      if (paths.length === 0) {
        setItems([]);
        return;
      }
      await load(paths);
    })();
    return () => {
      cancelled = true;
    };
    // `load` is stable for the lifetime of the command; the selection is read once.
  }, [load, hasApiKey]);

  const regenerate = useCallback(
    async (item: RenameItem) => {
      // Clearing the error matters as much as setting the status: a title that
      // arrives now supersedes whatever went wrong last time, and the detail
      // pane would otherwise keep printing the stale reason beside it.
      updateItem(item.path, { status: "analyzing", error: null });
      const toast = await showToast({ style: Toast.Style.Animated, title: "Generating another title" });
      try {
        const content = await readAnalysisContent(item.path);
        const title = await generateTitle(preferences(), item.originalName, content, {
          previousTitle: item.proposedTitle ?? item.originalName,
          variationNumber: item.generationCount + 1,
        });
        updateItem(item.path, {
          status: "ready",
          proposedTitle: title,
          generationCount: item.generationCount + 1,
        });
        toast.style = Toast.Style.Success;
        toast.title = "New title ready";
        toast.message = title;
      } catch (error) {
        const patch = failurePatch(error);
        updateItem(item.path, patch);
        toast.style = Toast.Style.Failure;
        toast.title = "Could not generate a title";
        toast.message = patch.error ?? undefined;
      }
    },
    [updateItem],
  );

  /** `toast` is passed in by the batch pass, which owns the progress readout. */
  const applyOne = useCallback(
    async (item: RenameItem, style = preferences().filenameStyle, toast?: Toast) => {
      if (!item.proposedTitle) return false;
      updateItem(item.path, { status: "applying" });

      const ownToast = toast ?? (await showToast({ style: Toast.Style.Animated, title: "Renaming the file" }));
      try {
        const outcome = await renameFile(item.path, item.proposedTitle, style);
        updateItem(item.path, {
          status: "renamed",
          path: outcome.path,
          renamedTo: outcome.name,
          error: null,
        });
        if (!toast) {
          ownToast.style = Toast.Style.Success;
          ownToast.title = outcome.unchanged ? "Name already matched" : "Renamed";
          ownToast.message = outcome.name;
        }
        return true;
      } catch (error) {
        updateItem(item.path, { status: "ready", error: message(error) });
        if (!toast) {
          ownToast.style = Toast.Style.Failure;
          ownToast.title = "Could not rename the file";
          ownToast.message = message(error);
        }
        return false;
      }
    },
    [updateItem],
  );

  const applyAll = useCallback(
    async (ready: RenameItem[]) => {
      // A batch is the default action, so it asks first. One file does not: the
      // name was just read on screen, and a dialog for it is pure friction.
      if (ready.length > 1) {
        const confirmed = await confirmAlert({
          title: `Rename ${ready.length} files?`,
          message: "Zush renames the files on disk. Undo is not available.",
          icon: Icon.Pencil,
          primaryAction: { title: "Rename", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
      }

      const style = preferences().filenameStyle;
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: progressTitle("Renaming", 0, ready.length),
      });

      let renamed = 0;
      for (const [index, item] of ready.entries()) {
        toast.title = progressTitle("Renaming", index, ready.length);
        toast.message = item.originalName;
        if (await applyOne(item, style, toast)) renamed += 1;
      }

      const allRenamed = renamed === ready.length;
      toast.style = allRenamed ? Toast.Style.Success : Toast.Style.Failure;
      toast.title = allRenamed
        ? `Renamed ${renamed} ${renamed === 1 ? "file" : "files"}`
        : `Renamed ${renamed} of ${ready.length}`;
      toast.message = allRenamed ? undefined : "The rest kept their names.";

      // Nothing left to look at once every file landed. A partial run stays open
      // so the rows that failed are still visible.
      if (allRenamed) await closeMainWindow();
    },
    [applyOne],
  );

  // The stored key is one local read away, so the key form is rendered straight
  // away in a loading state rather than flashing an empty list in front of it.
  if (!hasApiKey) {
    return <MissingApiKeyView />;
  }

  if (items === null) {
    return <List isLoading searchBarPlaceholder="Reading the Finder selection…" />;
  }

  if (items.length === 0) {
    return <NothingSelectedView onChooseFiles={load} />;
  }

  const ready = items.filter((item) => item.status === "ready" && item.proposedTitle);
  const skipped = items.filter((item) => item.status !== "renamed" && zushAppHandles(item.path));
  const style = preferences().filenameStyle;

  return (
    <List
      isLoading={isAnalyzing}
      isShowingDetail={isShowingDetail}
      searchBarPlaceholder={`${items.length} ${items.length === 1 ? "file" : "files"} from Finder`}
    >
      {items.map((item) => (
        <List.Item
          key={item.path}
          icon={rowIcon(item)}
          title={displayName(item, style)}
          // Raycast advises against accessories while the detail pane is open,
          // and the pane already carries everything they were standing in for.
          subtitle={isShowingDetail ? undefined : subtitle(item)}
          accessories={isShowingDetail ? undefined : accessories(item, style)}
          detail={<List.Item.Detail markdown={detailMarkdown(item, style)} />}
          actions={
            <ActionPanel>
              {/* This row cannot be renamed here at all, so whatever can rename
                  it leads: the hand-off if the app is installed, the download if
                  it is not. Undefined means the lookup is still running. */}
              {isZushOnly(item) && zushApp !== undefined ? (
                <ZushSection item={item} skipped={skipped} zushApp={zushApp} />
              ) : null}

              {/* The Finder selection is the request, so the batch is what Enter
                  does. Raycast prints the primary action's title in the footer,
                  so the count is on screen before the key is pressed. A single
                  ready file collapses the two into one action. */}
              <ActionPanel.Section>
                {ready.length > 1 ? (
                  <Action
                    title={`Rename All ${ready.length} Ready Files`}
                    icon={Icon.Wand}
                    // Declared as well as first, so it stays reachable on a row
                    // where the hand-off takes the primary slot.
                    shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
                    onAction={() => applyAll(ready)}
                  />
                ) : null}
                {item.status === "ready" && item.proposedTitle ? (
                  <Action
                    title="Rename This File"
                    icon={Icon.Pencil}
                    shortcut={ready.length > 1 ? { modifiers: ["cmd"], key: "return" } : undefined}
                    onAction={() => applyOne(item)}
                  />
                ) : null}
              </ActionPanel.Section>

              <ActionPanel.Section>
                {item.status === "ready" || item.status === "failed" || item.status === "renamed" ? (
                  <Action
                    title="Generate Another Title"
                    icon={Icon.ArrowClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => regenerate(item)}
                  />
                ) : null}
                {item.status === "ready" && item.proposedTitle ? (
                  <Action
                    title="Edit Title…"
                    icon={Icon.TextInput}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() =>
                      push(
                        <EditTitleView
                          item={item}
                          onSubmit={(title) => updateItem(item.path, { proposedTitle: title })}
                        />,
                      )
                    }
                  />
                ) : null}
                {item.proposedTitle ? (
                  <Action.CopyToClipboard
                    title="Copy Suggested Name"
                    content={buildFilename(item.proposedTitle, item.originalName, style)}
                    shortcut={Keyboard.Shortcut.Common.Copy}
                  />
                ) : null}
                <Action
                  title={isShowingDetail ? "Hide Full Names" : "Show Full Names"}
                  icon={Icon.Text}
                  shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
                  onAction={() => setIsShowingDetail((shown) => !shown)}
                />
              </ActionPanel.Section>

              <ActionPanel.Section>
                <Action.ShowInFinder path={item.path} />
                <Action.Open title="Open File" target={item.path} />
              </ActionPanel.Section>

              {isZushOnly(item) && zushApp !== undefined ? null : (
                <ZushSection item={item} skipped={skipped} zushApp={zushApp} />
              )}

              <FeedbackSection />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

/**
 * Shown when there is nothing to work on. Rows rather than an EmptyView, so the
 * next step is one keystroke away instead of hidden behind the action panel.
 */
function NothingSelectedView({ onChooseFiles }: { onChooseFiles: (paths: string[]) => Promise<void> }) {
  const { push } = useNavigation();
  return (
    <List searchBarPlaceholder="Nothing selected in Finder">
      <List.Section title="Next step">
        <List.Item
          icon={Icon.Document}
          title="Choose Files…"
          subtitle="Pick the files to rename"
          actions={
            <ActionPanel>
              <Action
                title="Choose Files…"
                icon={Icon.Document}
                onAction={() => push(<FilePickerView onSubmit={onChooseFiles} />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Finder}
          title="Select Files in Finder"
          subtitle="Then run this command from Finder"
          accessories={[{ text: "⌘⇥" }]}
          actions={
            <ActionPanel>
              <Action.Open title="Open Finder" target="/System/Library/CoreServices/Finder.app" />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="More from Zush">
        <List.Item
          icon={{ source: "zush-app.png" }}
          title="Zush Desktop"
          subtitle="Native macOS app for renaming at scale"
          accessories={[{ text: "Learn more" }]}
          actions={
            <ActionPanel>
              <Action
                title="About Zush Desktop"
                icon={{ source: "zush-app.png" }}
                onAction={() => push(<AboutZushView />)}
              />
              <Action.OpenInBrowser title="Open Zushapp.com" url={withZushUtm(ZUSH_WEBSITE, "empty-state")} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

const GEMINI_API_KEY_URL = "https://aistudio.google.com/apikey";

/**
 * Only reachable when Raycast's required-preference gate did not run, which
 * happens while an extension is in development. A store install collects the key
 * before the command opens, so this is a guard, not the onboarding.
 */
function MissingApiKeyView() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Key}
        title="Add your Gemini API key"
        description="Paste it into the extension preferences. Press Enter to get a free key."
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Get Gemini API Key" icon={Icon.Key} url={GEMINI_API_KEY_URL} />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <FeedbackSection />
          </ActionPanel>
        }
      />
    </List>
  );
}

/**
 * Whether the Zush app is on this Mac. `undefined` while the lookup is running,
 * `null` once it is known to be missing.
 */
function useZushApp(): Application | null | undefined {
  const [app, setApp] = useState<Application | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    findZushApp()
      .then((found) => {
        if (!cancelled) setApp(found ?? null);
      })
      .catch(() => {
        if (!cancelled) setApp(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return app;
}

/**
 * The Zush section of an item's action panel. The hand-off is only offered when
 * the app is actually installed — an action that cannot run would be a promise
 * the extension breaks. Without the app, a file the extension skipped gets a
 * plainly labelled link instead, and only when the app would have handled it.
 */
function ZushSection({
  item,
  skipped,
  zushApp,
}: {
  item: RenameItem;
  skipped: RenameItem[];
  zushApp: Application | null | undefined;
}) {
  const { push } = useNavigation();
  const handled = zushAppHandles(item.path);

  return (
    <ActionPanel.Section>
      {zushApp && handled ? <OpenInZushAction app={zushApp} paths={[item.path]} title="Open in Zush Desktop" /> : null}
      {zushApp && skipped.length > 1 ? (
        <OpenInZushAction
          app={zushApp}
          paths={skipped.map((entry) => entry.path)}
          title={`Open ${skipped.length} Skipped Files in Zush Desktop`}
        />
      ) : null}
      {/* For a file only the app can rename, the download leads the section and
          so becomes the primary action. On any other row it sits below About,
          where it cannot displace the rename. */}
      {zushApp === null && handled ? <DownloadZushAction content="skipped-file" /> : null}
      <Action title="About Zush Desktop" icon={{ source: "zush-app.png" }} onAction={() => push(<AboutZushView />)} />
      {zushApp === null && !handled ? <DownloadZushAction content="action-panel" /> : null}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel.Section>
  );
}

const REPOSITORY = "https://github.com/design-ninja/zush-raycast";
const SUPPORT_EMAIL = "lirik@lirik.pro";

/**
 * Raycast adds its own Report Bug to the root search once an extension ships
 * from the Store, but that files against raycast/extensions and never reaches
 * the author. These two do, and they work before publication as well.
 */
function FeedbackSection() {
  const body = [
    "",
    "",
    "---",
    `Extension: ${environment.extensionName}`,
    `Raycast: ${environment.raycastVersion}`,
  ].join("\n");

  return (
    <ActionPanel.Section title="Feedback">
      <Action.OpenInBrowser
        title="Report Bug"
        icon={Icon.Bug}
        url={`${REPOSITORY}/issues/new?body=${encodeURIComponent(body)}`}
      />
      <Action.OpenInBrowser
        title="Contact Support"
        icon={Icon.Envelope}
        url={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Zush AI Renamer")}`}
      />
    </ActionPanel.Section>
  );
}

/** Offered only when the app is absent; `content` records which row led here. */
function DownloadZushAction({ content }: { content: string }) {
  return (
    <Action.OpenInBrowser
      title="Download Zush App"
      icon={{ source: "zush-app.png" }}
      url={withZushUtm(ZUSH_WEBSITE, content)}
    />
  );
}

/** Hands files to the installed Zush app. */
function OpenInZushAction({ app, paths, title }: { app: Application; paths: string[]; title: string }) {
  return (
    <Action
      title={title}
      icon={{ source: "zush-app.png" }}
      onAction={async () => {
        try {
          await openInZush(paths, app);
          await closeMainWindow();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Could not open Zush",
            message: message(error),
          });
        }
      }}
    />
  );
}

/**
 * What the Zush app adds on top of this extension. The comparison lives in
 * Detail.Metadata rather than a markdown table, because Raycast renders
 * CommonMark and tables are not part of it.
 */
function AboutZushView() {
  const zushApp = useZushApp();
  return (
    <Detail
      navigationTitle="Zush Desktop"
      markdown={ABOUT_ZUSH_MARKDOWN}
      metadata={
        <Detail.Metadata>
          {/* An empty title puts the icon and the label on one line; a title of
              its own would sit above them and split every feature in two. */}
          <Detail.Metadata.Label title="Included in Zush Desktop" />
          {DESKTOP_FEATURES.map((feature) => (
            <Detail.Metadata.Label
              key={feature.label}
              title=""
              text={feature.label}
              icon={{ source: feature.icon, tintColor: feature.tint }}
            />
          ))}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Download Zush Desktop"
            icon={{ source: "zush-app.png" }}
            url={withZushUtm(ZUSH_WEBSITE, "about-view")}
          />
          {zushApp ? <OpenInZushAction app={zushApp} paths={[]} title="Open Zush Desktop" /> : null}
        </ActionPanel>
      }
    />
  );
}

/**
 * The paywall list from `apps/web/src/components/desktop-features.ts` in the Zush
 * Drive app: same features, same order, same wording.
 *
 * The tints are that app's OKLCH tone palette converted to hex, since
 * `Color.Raw` takes hex and Raycast's own eight colors cannot carry a brand
 * palette. Raycast still adjusts a raw colour for contrast, so these hold up in
 * both themes.
 */
const DESKTOP_FEATURES: Array<{ label: string; icon: Icon; tint: string }> = [
  { label: "Unlimited Cloud AI renames", icon: Icon.Stars, tint: "#FA8927" },
  { label: "100+ file types support", icon: Icon.Document, tint: "#F94144" },
  { label: "BYOK (Bring Your Own Key)", icon: Icon.Key, tint: "#7EAA00" },
  { label: "Offline AI mode (Ollama)", icon: Icon.ComputerChip, tint: "#0086F9" },
  { label: "Folders Monitor", icon: Icon.MagnifyingGlass, tint: "#00A4C8" },
  { label: "Activity with undo", icon: Icon.ArrowCounterClockwise, tint: "#DA8B00" },
  { label: "Templates & Custom AI Blocks", icon: Icon.Layers, tint: "#30D158" },
  { label: "60 languages support", icon: Icon.Globe, tint: "#3568F6" },
];

// Without raycast-width the image is drawn at the width of the markdown pane,
// which for a square icon means it fills the view and pushes the text out.
/**
 * The banner is 880x396 and drawn at exactly half that, so it fills the markdown
 * pane without being resampled. Its height is what makes the heading and the
 * paragraph below it fit without scrolling: the pane shows about 352pt, and
 * banner plus heading plus three lines of body comes to roughly 338. Its rounded corners are baked into the alpha
 * channel; markdown carries no CSS, and a transparent corner is the only kind
 * that sits correctly on both the light and the dark theme.
 *
 * The heading is h2 rather than h1 because Raycast fixes the type scale and the
 * level is the only handle on it. Body size cannot be changed at all, so the copy
 * is kept to one paragraph instead.
 */
const ABOUT_ZUSH_MARKDOWN = `![Zush Desktop](zush-desktop-banner.png?raycast-width=440&raycast-height=198)

## Unlock all features in Zush Desktop

The native macOS app does what a launcher window cannot: watch folders in the background, read RAW,
video and audio, reuse naming rules, and undo.
`;

function FilePickerView({ onSubmit }: { onSubmit: (paths: string[]) => Promise<void> }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Generate Titles"
            icon={Icon.Wand}
            onSubmit={async (values: { files: string[] }) => {
              if (!values.files || values.files.length === 0) {
                await showToast({ style: Toast.Style.Failure, title: "Choose at least one file" });
                return;
              }
              pop();
              await onSubmit(values.files);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="files"
        title="Files"
        info="Choose one or more files to rename."
        allowMultipleSelection
        canChooseDirectories={false}
      />
    </Form>
  );
}

function EditTitleView({ item, onSubmit }: { item: RenameItem; onSubmit: (title: string) => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Title"
            icon={Icon.Check}
            onSubmit={(values: { title: string }) => {
              const title = values.title.trim();
              if (!title) {
                showToast({ style: Toast.Style.Failure, title: "The title cannot be empty" });
                return;
              }
              onSubmit(title);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title="Current name" text={item.originalName} />
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter a new title"
        info="The extension is added automatically."
        defaultValue={item.proposedTitle ?? ""}
      />
    </Form>
  );
}

function displayName(item: RenameItem, style: ReturnType<typeof preferences>["filenameStyle"]): string {
  if (item.status === "renamed" && item.renamedTo) return item.renamedTo;
  if (item.proposedTitle) return buildFilename(item.proposedTitle, item.originalName, style);
  return item.originalName;
}

/**
 * The left side carries the long text — the old name, or why the file was
 * skipped. Accessories stay short so the status tag is never squeezed out of the
 * row, which is what happened when the reason lived on the right.
 */
/**
 * The file's own picture where there is one, and the document icon otherwise.
 * The fallback only has to cover an image Raycast turns out not to decode, and
 * it cannot be a file icon: Image.Fallback takes an Icon or an asset, not a path.
 */
function rowIcon(item: RenameItem): Image.ImageLike {
  const preview = previewUrl(item.path);
  if (!preview) return { fileIcon: item.path };
  // A photo cropped square sits oddly among macOS document icons; the mask is
  // Raycast's own, and it applies to the fallback too.
  return { source: preview, fallback: Icon.Image, mask: Image.Mask.RoundedRectangle };
}

/** Reads as "Renaming 3 of 12", or just the verb when there is a single file. */
function progressTitle(verb: string, done: number, total: number): string {
  return total === 1 ? `${verb} the file` : `${verb} ${Math.min(done + 1, total)} of ${total}`;
}

/** The extension declined this file; the Mac app may still handle it. */
function isSkipped(item: RenameItem): boolean {
  return item.status === "unsupported" || item.status === "too_large";
}

function subtitle(item: RenameItem): string | undefined {
  if (item.status === "ready" || item.status === "renamed") return item.originalName;
  if (isZushOnly(item)) return skippedNote(item);
  return item.error ?? undefined;
}

/** A file this extension will not read but the Zush app will. */
function isZushOnly(item: RenameItem): boolean {
  return isSkipped(item) && zushAppHandles(item.path);
}

/**
 * For a Zush-only file, saying where it can be renamed is more use than saying
 * again that it cannot be renamed here.
 */
function skippedNote(item: RenameItem): string {
  return isZushOnly(item) ? `${extname(item.path).toLowerCase()} renaming is in Zush Desktop App` : (item.error ?? "");
}

/**
 * One short tag. For a file this extension skipped but the Mac app renames, the
 * tag names the app instead of repeating "unsupported" — it is the only place in
 * the row wide enough to say where the file can go.
 */
function accessories(item: RenameItem, style: ReturnType<typeof preferences>["filenameStyle"]): List.Item.Accessory[] {
  // The tag is the only thing on the row that can hold a tooltip, so the full
  // name hangs off it for anyone reaching for the mouse.
  const tooltip = item.proposedTitle
    ? buildFilename(item.proposedTitle, item.originalName, style)
    : (item.error ?? null);

  if (isZushOnly(item)) {
    return [{ tag: { value: "Zush App only", color: "#6155F5" }, tooltip: skippedNote(item) }];
  }
  const label = STATUS_LABELS[item.status];
  return [{ tag: { value: label.text, color: label.color }, tooltip }];
}

/**
 * What the detail pane shows: the whole name, wrapped, which the row cannot do.
 * Markdown specials are escaped so a title containing `*` or `_` is read as text.
 */
function detailMarkdown(item: RenameItem, style: ReturnType<typeof preferences>["filenameStyle"]): string {
  const heading = item.status === "renamed" ? "Renamed to" : "New name";
  const proposed = item.proposedTitle ? buildFilename(item.proposedTitle, item.originalName, style) : null;

  const lines = proposed
    ? [`**${heading}**`, "", escapeMarkdown(proposed)]
    : isZushOnly(item)
      ? ["**Zush App only**", "", escapeMarkdown(skippedNote(item))]
      : [`**${STATUS_LABELS[item.status].text}**`, "", escapeMarkdown(item.error ?? "Waiting to be read.")];

  lines.push("", "**Current name**", "", escapeMarkdown(item.originalName));

  const preview = previewUrl(item.path);
  if (preview) lines.push("", `![](${preview}?raycast-width=340)`);
  if (proposed && item.error) lines.push("", `**Note**`, "", escapeMarkdown(item.error));
  return lines.join("\n");
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!|>~]/g, (character) => `\\${character}`);
}

const STATUS_LABELS: Record<ItemStatus, { text: string; color: Color }> = {
  pending: { text: "Queued", color: Color.SecondaryText },
  analyzing: { text: "Analyzing", color: Color.Blue },
  ready: { text: "Ready", color: Color.Green },
  applying: { text: "Renaming", color: Color.Blue },
  renamed: { text: "Renamed", color: Color.Green },
  unsupported: { text: "Unsupported", color: Color.SecondaryText },
  too_large: { text: "Too large", color: Color.Orange },
  failed: { text: "Failed", color: Color.Red },
};

/**
 * Which of `paths` are folders. Finder hands over whatever was selected, and a
 * folder judged on its extension alone is told it is a file type Zush does not
 * support — or, if its name happens to carry a dot, told that about an extension
 * it does not have. A path that cannot be read is left to the extension check,
 * which is where it stood before.
 */
async function folderPaths(paths: string[]): Promise<Set<string>> {
  const folders = await Promise.all(
    paths.map((path) =>
      stat(path)
        .then((info) => (info.isDirectory() ? path : null))
        .catch(() => null),
    ),
  );
  return new Set(folders.filter((path) => path !== null));
}

/**
 * Why this path cannot be renamed here, or `null` when it can.
 *
 * A Keynote, Pages or Numbers document is a package: a directory to the
 * filesystem, a single document to whoever selected it, and a file the Zush app
 * renames. Those are judged on their extension like any other document, so the
 * row keeps pointing at the app that can help. Only a directory that is not a
 * document of a kind Zush recognizes is called a folder.
 */
function loadRejection(path: string, isFolder: boolean): string | null {
  if (isFolder && !zushAppHandles(path)) return FOLDER_NOT_RENAMED;
  if (isSupportedFile(path)) return null;
  return `${extname(path).toLowerCase() || "This file type"} is not supported`;
}

async function selectedFinderPaths(): Promise<string[]> {
  try {
    return (await getSelectedFinderItems()).map((entry) => entry.path);
  } catch {
    // Finder was not the frontmost app, so there is nothing to read.
    return [];
  }
}

/** One key covers the batch, so every row that fails on it says the same thing. */
const REJECTED_KEY = "Google rejected the API key";

function failurePatch(error: unknown): Partial<RenameItem> {
  if (error instanceof InvalidApiKeyError) {
    return { status: "failed", error: REJECTED_KEY };
  }
  if (error instanceof UnsupportedFileError) {
    return { status: "unsupported", error: error.message };
  }
  if (error instanceof FileTooLargeError) {
    return { status: "too_large", error: error.message };
  }
  if (error instanceof RetryableProviderError) {
    return { status: "failed", error: `${error.message} Press ⌘R to retry.` };
  }
  return { status: "failed", error: message(error) };
}

function message(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "TimeoutError" ? "The request timed out." : error.message;
  }
  return String(error);
}

/** Runs `worker` over `entries`, keeping at most `limit` in flight. */
async function runWithConcurrency<T>(entries: T[], limit: number, worker: (entry: T) => Promise<void>): Promise<void> {
  const queue = [...entries];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      await worker(next);
    }
  });
  await Promise.all(runners);
}
