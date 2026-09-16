# Zen Browser

Search and open Zen Browser tabs from search query, opened tabs, bookmarks and history.

I just copied the Mozilla Firefox extension of crisboarna and adjusted it to fit Zen Browser, so all the credit goes to that extension.

New Tab search can be configured to search from the following sources:
- Google(default)
- DuckDuckGo
- Bing
- Brave
- Baidu
- Qwant

## Pinned tabs (macOS companion)

Search Bookmarks keeps the original bookmarks search and adds live pinned tabs from Zen through a companion WebExtension. The two lists have independent result limits. Missing companion connectivity is shown in the list; ordinary bookmarks remain available.

The companion activates an existing tab using `browser.tabs.update(id, { active: true })`, then focuses its window. It never creates tabs, changes URLs or titles, or operates the address bar or folders. Zen controls workspace selection and the resulting sidebar behavior; the initial integration has been checked manually in Zen.

### Setup

To include pinned tabs in **Search Bookmarks**:

1. Install [Zen Browser Bridge from Mozilla Add-ons](https://addons.mozilla.org/firefox/addon/zen-browser-bridge/) in **Zen Browser**.
2. Open **Search Bookmarks** in Raycast, select **Connect to Zen Browser**, and choose **Set Up or Repair Zen Connection**.
3. Restart Zen, then reopen the command or choose **Refresh Pinned Tabs**.

Raycast installs the bundled local helper for you. No terminal commands, separate Node.js installation, administrator access, or downloaded executable are required. Setup uses the Node.js runtime running the Raycast command (version 22 or newer). If that runtime moves after a Raycast update, run **Set Up or Repair Zen Connection** again. The same action is available in the action menu of pinned results.

Ordinary bookmarks do not require the companion. The companion source and tests live in [Zen-Browser-Bridge](https://github.com/sandzhaj/Zen-Browser-Bridge).

### Scope and privacy

The bridge reads pinned tabs from all running profiles with the companion installed; ordinary bookmarks still use the configured Raycast profile. Private tabs are excluded. The companion supplies titles and URLs. Updated companion versions read saved Zen sidebar names using per-tab session markers; renames become available after Zen saves its session and the command is reopened. Workspace names and an Essential/Pinned distinction are not exposed. Essentials appear when Zen reports them as pinned.

Transport stays on this Mac: the browser starts a Native Messaging process and Raycast connects to a Unix socket inside `~/.zen-browser-bridge` (directory mode 0700, socket mode 0600). Raycast does not read browser session files or use UI automation for pinned tabs. The companion may read saved session metadata to resolve renamed titles. No web server, Accessibility permission, or remote debugging is required. Each browser session has a separate identifier, so stale results cannot activate a reused tab ID after restart.

To disconnect, choose **Remove Zen Connection** in the command action menu, then restart Zen. Do this before uninstalling the Raycast extension. It removes only the native host registered to this Raycast extension; standalone installations are not removed. Remove the browser add-on separately in Zen.

The helper is copied to this extension’s Raycast support directory, with its registration in `~/Library/Application Support/Mozilla/NativeMessagingHosts/zen_browser_bridge.json`. Running a setup action explicitly replaces an existing registration for the same Zen Browser Bridge add-on; other clients using that bridge will then use the Raycast-managed helper. No existing standalone helper files or socket directory are deleted.

The companion is independent of Raycast. See [its protocol and standalone usage](https://github.com/sandzhaj/Zen-Browser-Bridge/blob/main/docs/PROTOCOL.md).

### Bundled helper source

`assets/bridge/host.cjs` and `titles.cjs` are MIT-licensed sources from [Zen Browser Bridge, commit a30ef44](https://github.com/sandzhaj/Zen-Browser-Bridge/tree/a30ef44/native), included as readable JavaScript for review. `setup.cjs` registers these bundled files only; it does not fetch code. Changes to the bundled helper go through this extension's review and release process. Run `npm test` to test setup without modifying the real browser registration.
