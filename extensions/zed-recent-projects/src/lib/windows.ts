import { join } from "node:path";
import { zedBuild } from "./preferences";
import { execFilePromise } from "./utils";
import { runPowerShellScript } from "@raycast/utils";

export function execWindowsZed(args: string[]) {
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    const windowsPath = join(localAppData, "Programs", zedBuild, "bin", "zed");
    return execFilePromise(windowsPath, args);
  } else {
    return execFilePromise("zed", args);
  }
}

export async function getSelectedFileExplorerItems() {
  const script = `
function Get-SelectedExplorerItemsInternal {
    [CmdletBinding()]
    Param()

    $shell = New-Object -ComObject Shell.Application
    $selectedPaths = @()

    foreach ($window in $shell.Windows()) {
        try {
            if ($window.Document -and $window.Document.Folder -and $window.Document.SelectedItems) {
                $items = $window.Document.SelectedItems()
                if ($items.Count -gt 0) {
                    foreach ($item in $items) {
                        $selectedPaths += $item.Path
                    }
                    return $selectedPaths
                }
            }
        }
        catch { }
    }
    return $selectedPaths
}

Get-SelectedExplorerItemsInternal | ForEach-Object { Write-Output $_ }
  `;

  const rawOutput = await runPowerShellScript(script);
  const paths = rawOutput
    .split(/\r?\n/)
    .map((path) => path.trim())
    .filter((line) => line !== "");
  return paths;
}

export async function getCurrentExplorerPath() {
  const script = `
$url = (New-Object -ComObject Shell.Application).Windows() |
  Where-Object { $_.LocationName -ne $null -and $_.LocationName -ne "Desktop" } |
  Select-Object -First 1 -ExpandProperty LocationURL

Write-Output $url
`;
  const path = decodeURI(await runPowerShellScript(script))
    .trim()
    .replace("file:///", "");

  return path;
}
