import { execSync } from "node:child_process";
import { EnvScope, EnvVar } from "./types";

/**
 * Execute a PowerShell command using UTF-16LE base64 encoded command.
 * This avoids all escaping issues with special characters.
 */
export function runPowerShell(command: string): string {
  const encoded = Buffer.from(command, "utf16le").toString("base64");
  return execSync(
    `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`,
    {
      encoding: "utf-8",
      timeout: 15000,
    },
  ).trim();
}

/**
 * Execute a PowerShell command with elevated (admin) privileges.
 * Will trigger a UAC prompt for the user.
 */
export function runPowerShellElevated(command: string): void {
  const escapedCommand = command.replace(/'/g, "''");
  const wrapper = `Start-Process powershell -Verb RunAs -Wait -ArgumentList '-NoProfile','-NonInteractive','-Command','${escapedCommand}'`;
  runPowerShell(wrapper);
}

/**
 * Retrieve all environment variables for a given scope.
 * Returns them sorted alphabetically by name.
 */
export function getAllEnvVars(scope: EnvScope): EnvVar[] {
  const ps = `
$vars = [System.Environment]::GetEnvironmentVariables('${scope}')
$result = @()
foreach ($key in $vars.Keys) {
  $result += @{ name = [string]$key; value = [string]$vars[$key] }
}
$result | ConvertTo-Json -Compress
`.trim();

  const output = runPowerShell(ps);
  if (!output || output === "") return [];

  const parsed = JSON.parse(output);
  const items: EnvVar[] = (Array.isArray(parsed) ? parsed : [parsed]).map(
    (item: { name: string; value: string }) => ({
      name: item.name,
      value: item.value,
      scope,
    }),
  );

  return items.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * Get a single environment variable value.
 * Returns null if the variable does not exist.
 */
export function getEnvVar(name: string, scope: EnvScope): string | null {
  const safeName = name.replace(/'/g, "''");
  const ps = `[System.Environment]::GetEnvironmentVariable('${safeName}', '${scope}')`;
  const output = runPowerShell(ps);
  return output === "" ? null : output;
}

/**
 * Set (create or update) an environment variable.
 * Machine-scope variables require elevation (UAC prompt).
 */
export function setEnvVar(name: string, value: string, scope: EnvScope): void {
  const safeName = name.replace(/'/g, "''");
  const safeValue = value.replace(/'/g, "''");
  const ps = `[System.Environment]::SetEnvironmentVariable('${safeName}', '${safeValue}', '${scope}')`;

  if (scope === "Machine") {
    runPowerShellElevated(ps);
  } else {
    runPowerShell(ps);
  }

  broadcastSettingChange();
}

/**
 * Delete an environment variable by setting it to null.
 * Machine-scope variables require elevation (UAC prompt).
 */
export function deleteEnvVar(name: string, scope: EnvScope): void {
  const safeName = name.replace(/'/g, "''");
  const ps = `[System.Environment]::SetEnvironmentVariable('${safeName}', $null, '${scope}')`;

  if (scope === "Machine") {
    runPowerShellElevated(ps);
  } else {
    runPowerShell(ps);
  }

  broadcastSettingChange();
}

/**
 * Broadcast WM_SETTINGCHANGE to all top-level windows so running
 * applications pick up the environment variable changes immediately.
 */
export function broadcastSettingChange(): void {
  const ps = `
try {
  if (-not ([System.Management.Automation.PSTypeName]'Win32.NativeMethods').Type) {
    Add-Type -Namespace Win32 -Name NativeMethods -MemberDefinition @'
[DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Auto)]
public static extern IntPtr SendMessageTimeout(
    IntPtr hWnd, uint Msg, UIntPtr wParam, string lParam,
    uint fuFlags, uint uTimeout, out UIntPtr lpdwResult);
'@
  }
  $HWND_BROADCAST = [IntPtr]0xFFFF
  $WM_SETTINGCHANGE = 0x001A
  $SMTO_ABORTIFHUNG = 0x0002
  $result = [UIntPtr]::Zero
  [Win32.NativeMethods]::SendMessageTimeout(
    $HWND_BROADCAST, $WM_SETTINGCHANGE, [UIntPtr]::Zero,
    'Environment', $SMTO_ABORTIFHUNG, 5000, [ref]$result
  ) | Out-Null
} catch {
  # Silently ignore - don't fail the main operation
}
`.trim();

  try {
    runPowerShell(ps);
  } catch {
    // Non-critical: don't fail the main operation if broadcast fails
  }
}
