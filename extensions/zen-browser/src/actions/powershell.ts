// PowerShell single-quoted literals do not expand $(...) subexpressions or
// variables, so user input passed through psLiteral stays data, not code.
export function psLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

// Start-Process joins its arguments with spaces and hands that string to Zen
// unquoted, so each argument has to be quoted for the Windows command line
// first: embedded quotes become \" and backslashes before a quote are doubled.
export function windowsArg(s: string): string {
  return `"${s.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, "$1$1")}"`;
}

export function newTabPowerShellScript(query?: string): string {
  if (!query) return `Start-Process "zen"`;
  // Zen reads an argument starting with - or / as an option even when it is
  // quoted, so such a query gets a leading space, which search engines ignore.
  const term = /^[-/]/.test(query) ? ` ${query}` : query;
  return `Start-Process "zen" -ArgumentList ${psLiteral(`-search ${windowsArg(term)}`)}`;
}

export function searchPowerShellScript(prefix: string, query?: string): string {
  return `Start-Process "zen" -ArgumentList ${psLiteral(windowsArg(`${prefix}${query ?? ""}`))}`;
}
