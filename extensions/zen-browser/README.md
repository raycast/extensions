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

The companion and its tests live in [Zen-Browser-Bridge](https://github.com/sandzhaj/Zen-Browser-Bridge). Follow that repository's installation instructions for the browser add-on and macOS native host. Then open **Search Bookmarks** in Raycast.

### Scope and privacy

The bridge reads pinned tabs from all running profiles with the companion installed; ordinary bookmarks still use the configured Raycast profile. Private tabs are excluded. The companion supplies titles and URLs. Updated companion versions read saved Zen sidebar names using per-tab session markers; renames become available after Zen saves its session and the command is reopened. Workspace names and an Essential/Pinned distinction are not exposed. Essentials appear when Zen reports them as pinned.

Transport stays on this Mac: the browser starts a Native Messaging process and Raycast connects to a Unix socket inside `~/.zen-browser-bridge` (directory mode 0700, socket mode 0600). Raycast does not read browser session files or use UI automation for pinned tabs. The companion may read saved session metadata to resolve renamed titles. No web server, Accessibility permission, or remote debugging is required. Each browser session has a separate identifier, so stale results cannot activate a reused tab ID after restart.

To remove the companion, remove it from Zen, delete `~/Library/Application Support/Mozilla/NativeMessagingHosts/zen_browser_bridge.json`, and remove `~/.zen-browser-bridge` after closing Zen.

The companion is independent of Raycast. See [its protocol and standalone usage](https://github.com/sandzhaj/Zen-Browser-Bridge/blob/main/docs/PROTOCOL.md).
