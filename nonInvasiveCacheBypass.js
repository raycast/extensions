"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preventCacheBypass = preventCacheBypass;
exports.clearBrowserCacheFiles = clearBrowserCacheFiles;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function extractDomain(input) {
    let domain = input.toLowerCase().trim();
    domain = domain.replace(/^[a-z]+:\/\//, "");
    domain = domain.split("/")[0];
    domain = domain.split("?")[0];
    domain = domain.split("#")[0];
    domain = domain.split(":")[0];
    return domain;
}
async function forceHardRefreshBlockedTabs(browser, domains) {
    try {
        let script = "";
        switch (browser.toLowerCase()) {
            case "safari":
                script = createSafariHardRefreshScript(domains);
                break;
            case "google chrome":
            case "chrome":
                script = createChromeHardRefreshScript(domains);
                break;
            case "arc":
                script = createArcHardRefreshScript(domains);
                break;
            case "microsoft edge":
            case "edge":
                script = createEdgeHardRefreshScript(domains);
                break;
            default:
                console.log(`Browser ${browser} not supported for hard refresh`);
                return;
        }
        await execAsync(`osascript -e '${script.replace(/'/g, "'\\''")}'`);
        console.log(`✅ Hard refreshed tabs in ${browser}`);
    }
    catch (error) {
        console.error(`Error hard refreshing tabs in ${browser}:`, error.message);
    }
}
function createSafariHardRefreshScript(domains) {
    return `
tell application "Safari"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          ${domains
        .map((domain) => {
        const cleanDomain = extractDomain(domain);
        const wwwVersion = cleanDomain.startsWith("www.")
            ? cleanDomain
            : `www.${cleanDomain}`;
        const nonWwwVersion = cleanDomain.replace(/^www\./, "");
        return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              -- Force hard refresh by reloading with cache bypass
              do JavaScript "window.location.reload(true); setTimeout(() => window.location.reload(true), 100);" in t
            end if`;
    })
        .join("\n          ")}
        end try
      end repeat
    end repeat
  end if
end tell
`;
}
function createChromeHardRefreshScript(domains) {
    return `
tell application "Google Chrome"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          ${domains
        .map((domain) => {
        const cleanDomain = extractDomain(domain);
        const wwwVersion = cleanDomain.startsWith("www.")
            ? cleanDomain
            : `www.${cleanDomain}`;
        const nonWwwVersion = cleanDomain.replace(/^www\./, "");
        return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              -- Force hard reload with cache bypass
              execute t javascript "window.location.reload(true);"
              delay 0.1
              execute t javascript "window.location.reload(true);"
            end if`;
    })
        .join("\n          ")}
        end try
      end repeat
    end repeat
  end if
end tell
`;
}
function createArcHardRefreshScript(domains) {
    return `
tell application "Arc"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          ${domains
        .map((domain) => {
        const cleanDomain = extractDomain(domain);
        const wwwVersion = cleanDomain.startsWith("www.")
            ? cleanDomain
            : `www.${cleanDomain}`;
        const nonWwwVersion = cleanDomain.replace(/^www\./, "");
        return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              -- Force hard reload
              tell t to reload
              delay 0.1
              tell t to reload
            end if`;
    })
        .join("\n          ")}
        end try
      end repeat
    end repeat
  end if
end tell
`;
}
function createEdgeHardRefreshScript(domains) {
    return `
tell application "Microsoft Edge"
  if it is running then
    repeat with w in windows
      repeat with t in tabs of w
        try
          set tabURL to URL of t
          ${domains
        .map((domain) => {
        const cleanDomain = extractDomain(domain);
        const wwwVersion = cleanDomain.startsWith("www.")
            ? cleanDomain
            : `www.${cleanDomain}`;
        const nonWwwVersion = cleanDomain.replace(/^www\./, "");
        return `if (tabURL contains "${cleanDomain}" or tabURL contains "${wwwVersion}" or tabURL contains "${nonWwwVersion}") then
              reload t
              delay 0.1
              reload t
            end if`;
    })
        .join("\n          ")}
        end try
      end repeat
    end repeat
  end if
end tell
`;
}
async function clearSystemDNSCache() {
    try {
        console.log("🧹 Clearing system DNS cache...");
        await execAsync("sudo dscacheutil -flushcache 2>/dev/null || true");
        await execAsync("sudo killall -HUP mDNSResponder 2>/dev/null || true");
        console.log("✅ System DNS cache cleared");
    }
    catch (error) {
        console.error("Error clearing DNS cache:", error.message);
    }
}
async function getRunningBrowsers() {
    const browsers = [
        { name: "Safari", process: "Safari" },
        { name: "Google Chrome", process: "Google Chrome" },
        { name: "Arc", process: "Arc" },
        { name: "Microsoft Edge", process: "Microsoft Edge" },
    ];
    const runningBrowsers = [];
    for (const browser of browsers) {
        try {
            await execAsync(`pgrep -x "${browser.process}"`);
            runningBrowsers.push(browser.name);
        }
        catch {
        }
    }
    return runningBrowsers;
}
async function preventCacheBypass(domains) {
    if (!domains || domains.length === 0) {
        return;
    }
    console.log(`🔄 Preventing cache bypass for ${domains.length} domain(s)...`);
    console.log("⚡ Using hard refresh (browser stays open!)");
    try {
        await clearSystemDNSCache();
        const runningBrowsers = await getRunningBrowsers();
        if (runningBrowsers.length === 0) {
            console.log("No browsers running - only DNS cache cleared");
            return;
        }
        console.log(`Browsers detected: ${runningBrowsers.join(", ")}`);
        const refreshPromises = runningBrowsers.map((browser) => forceHardRefreshBlockedTabs(browser, domains));
        await Promise.allSettled(refreshPromises);
        console.log("✅ Cache bypass prevention complete (browser stayed open!)");
    }
    catch (error) {
        console.error("Error preventing cache bypass:", error.message);
    }
}
async function clearBrowserCacheFiles(domains) {
    console.log("🧹 Clearing browser cache files (browser will stay open)...");
    const homeDir = process.env.HOME || "/Users/" + process.env.USER;
    const cachePaths = [
        `${homeDir}/Library/Caches/com.apple.Safari/Cache.db*`,
        `${homeDir}/Library/Caches/Google/Chrome/Default/Cache`,
        `${homeDir}/Library/Caches/com.arc.Arc/`,
    ];
    for (const cachePath of cachePaths) {
        try {
            execAsync(`rm -rf "${cachePath}" 2>/dev/null &`).catch(() => { });
        }
        catch (error) {
        }
    }
    console.log("✅ Cache files cleared (browser stayed open)");
}
//# sourceMappingURL=nonInvasiveCacheBypass.js.map