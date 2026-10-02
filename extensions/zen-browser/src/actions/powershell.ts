// PowerShell single-quoted literals do not expand $(...) subexpressions or
// variables, so user input passed through psLiteral stays data, not code.
export function psLiteral(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

export function newTabPowerShellScript(query?: string): string {
  return query ? `Start-Process "zen" "-search" ${psLiteral(query)}` : `Start-Process "zen"`;
}

export function searchPowerShellScript(prefix: string, query?: string): string {
  return `Start-Process "zen" ${psLiteral(`${prefix}${query ?? ""}`)}`;
}
