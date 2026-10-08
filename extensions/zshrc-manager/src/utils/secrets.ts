/**
 * Secret detection and masking for displayed values.
 *
 * Masking is a display concern only: copy actions always receive the real
 * value. The heuristic keys on the variable NAME, never the value — matching
 * on value shape produces false positives on ordinary paths.
 */

import { stripSurroundingQuotes } from "./shell-escape";

/**
 * Variable names matching this pattern are treated as secrets
 */
export const SECRET_NAME_PATTERN = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|AUTH|PRIVATE|API)/i;

/**
 * Returns true when a variable name looks like it holds a secret
 */
export function isSecretName(name: string): boolean {
  return SECRET_NAME_PATTERN.test(name);
}

/**
 * Masks a value to its first and last three characters.
 *
 * Values of eight characters or fewer are masked entirely, since showing
 * six of eight characters would defeat the mask.
 */
export function maskValue(value: string): string {
  if (value.length <= 8) {
    return "••••••••";
  }
  return `${value.slice(0, 3)}•••••${value.slice(-3)}`;
}

/**
 * Value safe to feed into substring search filters: empty for secrets, so a
 * masked value can never be discovered by typing it
 */
export function searchableValue(name: string, value: string): string {
  return isSecretName(name) ? "" : value;
}

// The export/typeset prefix is optional so bare assignments of
// secret-looking names (`MY_TOKEN=…` before a later `export MY_TOKEN`)
// are masked in previews too
const EXPORT_LINE = /^(\s*(?:(?:export|typeset\s+-x)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*)(.*)$/;

/**
 * Masks secret export values inside raw zshrc content so previews and
 * markdown blocks can render file excerpts without displaying secrets
 */
export function maskSecretsInContent(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      const match = EXPORT_LINE.exec(line);
      if (match && isSecretName(match[2]!)) {
        return `${match[1]}${maskValue(stripSurroundingQuotes(match[3]!))}`;
      }
      return line;
    })
    .join("\n");
}
