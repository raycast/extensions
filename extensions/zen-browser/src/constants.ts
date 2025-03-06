export const SEARCH_ENGINE: { [key: string]: string } = {
  google: `https://google.com/search?q=`,
  bing: `https://www.bing.com/search?q=`,
  baidu: `https://www.baidu.com/s?wd=`,
  brave: `https://search.brave.com/search?q=`,
  duckduckgo: `https://duckduckgo.com/?q=`,
  qwant: `https://www.qwant.com/?q=`,
};

const ZEN_BROWSER_LOGO = "https://cdn.jsdelivr.net/gh/zen-browser/branding/Main%20icons/SVG/zen-black.svg";

export const DownloadText = `
  # 🚨Error: Zen Browser browser is not installed

  ## This extension depends on Zen browser. You must install it to continue.
  
  If you have [Homebrew](https://brew.sh/) installed then press ⏎ (Enter Key) to install Zen browser.
  [Click here](https://zen-browser.app/download) if you want to download manually.

  > **Note:** If Zen Browser is already installed but you're seeing this message,
  > you may need to adjust the profile configuration in the exention settings. You
  > can find your profile names by visiting \`about:profiles\` in Zen Browser.
  
  [![Zen Browser](${ZEN_BROWSER_LOGO})]()
`;
export const NoBookmarksText = `
# 🚨Error: Zen browser has no bookmarks. Please add some bookmarks to continue using this command.

[![Zen Browser](${ZEN_BROWSER_LOGO})]()
`;

export const UnknownErrorText = `
# 🚨Error: Something happened while trying to run your command
  
[![Zen Browser](${ZEN_BROWSER_LOGO})]()
`;

export const DEFAULT_ERROR_TITLE = "An Error Occurred";

export const NOT_INSTALLED_MESSAGE = "Zen Browser not installed";
export const NO_BOOKMARKS_MESSAGE = "Zen Browser has no bookmarks";
