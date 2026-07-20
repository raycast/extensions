import { Action, Keyboard } from "@raycast/api";

/**
 * Creates standard "Open" and "Copy Link" actions for a given URL
 * @param url - The URL to open/copy
 * @param openTitle - The title for the open action (e.g., "Open Ticket", "Open User Profile")
 * @param copyTitle - Optional custom title for the copy action (defaults to "Copy Link")
 * @param openShortcut - Optional custom shortcut for the open action
 * @param copyShortcut - Optional custom shortcut for the copy action
 */
export const createEntityOpenAndCopyActions = (
  url: string,
  openTitle: string,
  copyTitle?: string,
  openShortcut?: Keyboard.Shortcut,
  copyShortcut?: Keyboard.Shortcut,
) => (
  <>
    <Action.OpenInBrowser
      key="open"
      title={openTitle}
      url={url}
      shortcut={openShortcut || Keyboard.Shortcut.Common.Open}
    />
    <Action.CopyToClipboard
      key="copy"
      title={copyTitle || "Copy Link"}
      content={url}
      shortcut={copyShortcut || Keyboard.Shortcut.Common.CopyDeeplink}
    />
  </>
);

/**
 * @deprecated Use createEntityOpenAndCopyActions instead for better naming and flexibility
 */
export const createOpenAndCopyActions = (url: string, title: string) => (
  <>
    <Action.OpenInBrowser key="open" title={title} url={url} shortcut={Keyboard.Shortcut.Common.Open} />
    <Action.CopyToClipboard
      key="copy"
      title={`Copy ${title}`}
      content={url}
      shortcut={Keyboard.Shortcut.Common.CopyDeeplink}
    />
  </>
);

/**
 * Creates a "Copy to Clipboard" action for content
 */
export const createCopyAction = (content: string, title: string, shortcut?: Keyboard.Shortcut) => (
  <Action.CopyToClipboard
    key={`copy-${title.toLowerCase().replace(/\s+/g, "-")}`}
    title={title}
    content={content}
    shortcut={shortcut || Keyboard.Shortcut.Common.Copy}
  />
);

/**
 * Creates a "Copy to Clipboard" action with custom shortcut
 */
export const createCopyActionWithShortcut = (content: string, title: string, shortcut: Keyboard.Shortcut) => (
  <Action.CopyToClipboard
    key={`copy-${title.toLowerCase().replace(/\s+/g, "-")}`}
    title={title}
    content={content}
    shortcut={shortcut}
  />
);

/**
 * Creates an "Open in Browser" action
 */
export const createOpenAction = (url: string, title: string, shortcut?: Keyboard.Shortcut) => (
  <Action.OpenInBrowser
    key="open-browser"
    title={title}
    url={url}
    shortcut={shortcut || Keyboard.Shortcut.Common.Open}
  />
);

/**
 * Creates an "Open in Browser" action with custom shortcut
 */
export const createOpenActionWithShortcut = (url: string, title: string, shortcut: Keyboard.Shortcut) => (
  <Action.OpenInBrowser
    key={`open-${title.toLowerCase().replace(/\s+/g, "-")}`}
    title={title}
    url={url}
    shortcut={shortcut}
  />
);
