/**
 * CREDIT: The AppleScript snippets were taken from the whois extension
 */
// Replace macOS-specific AppleScript functionality with Windows-compatible browser integration
import { execFile } from "child_process";
import { runAppleScript } from "@raycast/utils";

const CHROMIUM_BROWSERS_REGEX = /Chrome|Opera|Brave|Edge|Vivaldi/i;
const WEBKIT_BROWSERS_REGEX = /Safari|Orion/i;

type WindowsBrowserInfo = {
  browser?: string;
  url?: string;
};

const WINDOWS_BROWSER_LABELS: Record<string, string> = {
  chrome: "Chrome",
  msedge: "Edge",
  brave: "Brave",
  opera: "Opera",
  vivaldi: "Vivaldi",
};

export default async (): Promise<string | undefined> => {
  if (process.platform === "darwin") {
    // macOS-specific code
    const browser = await getFrontmostAppMacOS();
    let url: string | undefined;

    if (browser.match(WEBKIT_BROWSERS_REGEX)) {
      url = await getWebKitURL(browser);
    } else if (browser.match(CHROMIUM_BROWSERS_REGEX)) {
      url = await getChromiumURLMacOS(browser);
    } else if (browser.match(/Arc/i)) {
      url = await getArcURL();
    }

    if (!url) {
      return;
    }

    try {
      return new URL(url).hostname;
    } catch (error) {
      console.error("Failed to get hostname", error);
      return;
    }
  } else if (process.platform === "win32") {
    // Windows-specific code
  const { url } = await getActiveChromiumTabWindows();

    if (!url) {
      return;
    }

    try {
      return new URL(url).hostname;
    } catch (error) {
      console.error("Failed to get hostname", error);
      return;
    }
  }
};

const getFrontmostAppMacOS = () => {
  return runAppleScript(`
    tell application "System Events"
      set frontmostApp to name of first application process whose frontmost is true
      return frontmostApp
    end tell
  `);
};

const getWebKitURL = (browser: string) => {
  return runAppleScript(`
    tell application "${browser}" to get URL of front document
  `);
};

const getChromiumURLMacOS = (browser = "Google Chrome") => {
  return runAppleScript(`
    tell application "${browser}"
      set currentTab to active tab of front window
      set currentURL to URL of currentTab
      return currentURL
    end tell
  `);
};

const getArcURL = () => {
  return runAppleScript(`
    tell application "Arc"
      tell front window
        get the URL of active tab
      end tell
    end tell
  `);
};

const runPowerShellCommand = async (script: string): Promise<string> => {
  const executables = ["powershell", "pwsh"];

  for (const executable of executables) {
    const encoded = Buffer.from(script, "utf16le").toString("base64");

    const output = await new Promise<string | undefined>((resolve) => {
      execFile(
        executable,
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded],
        { windowsHide: true },
        (error, stdout) => {
          if (error) {
            console.error(`Error running ${executable} command`, error);
            return resolve(undefined);
          }
          resolve(stdout.trim());
        }
      );
    });

    if (output !== undefined) {
      return output;
    }
  }

  return "";
};

const getActiveChromiumTabWindows = async (): Promise<WindowsBrowserInfo> => {
  const script = `
$ErrorActionPreference = "SilentlyContinue"
Add-Type -AssemblyName UIAutomationClient
$automation = New-Object -ComObject UIAutomationClient.CUIAutomation
if (-not $automation) { return }
$element = $automation.GetForegroundElement()
if (-not $element) { return }
$processId = $element.CurrentProcessId
$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
if (-not $process) { return }
$browser = $process.ProcessName
if ($browser -notmatch '^(chrome|msedge|brave|opera|vivaldi)$') { return }
$controlTypePropertyId = 30003
$namePropertyId = 30005
$editControlTypeId = 50004
$treeScopeDescendants = 4
$valuePatternId = 10002
$typeCondition = $automation.CreatePropertyCondition($controlTypePropertyId, $editControlTypeId)
$nameCondition = $automation.CreatePropertyCondition($namePropertyId, "Address and search bar")
$combinedCondition = $automation.CreateAndCondition($typeCondition, $nameCondition)
$addressBar = $element.FindFirst($treeScopeDescendants, $combinedCondition)
if (-not $addressBar) { return }
$valuePattern = $addressBar.GetCurrentPattern($valuePatternId)
if (-not $valuePattern) { return }
$valuePattern = [UIAutomationClient.IUIAutomationValuePattern]$valuePattern
$value = $valuePattern.CurrentValue
if ([string]::IsNullOrWhiteSpace($value)) { return }
@{ browser = $browser; url = $value } | ConvertTo-Json -Compress
`;

  const output = await runPowerShellCommand(script);

  if (!output) {
    return {};
  }

  try {
    const parsed = JSON.parse(output) as WindowsBrowserInfo;
    const browserKey = parsed.browser?.toLowerCase();
    const friendlyBrowser = browserKey ? WINDOWS_BROWSER_LABELS[browserKey] ?? parsed.browser : undefined;

    return {
      browser: friendlyBrowser,
      url: parsed.url,
    };
  } catch (error) {
    console.error("Failed to parse Windows browser info", error);
    return {};
  }
};
