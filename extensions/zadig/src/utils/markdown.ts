// Covers markdown syntax, LaTeX delimiters such as \( and $$, and & so existing character codes also show literally.
const SPECIAL_CHARACTERS = /[\\`*_[\]()!<>#|~$&]/g;

// ! Every value is typed by Zadig users, so newlines are flattened and each special character becomes its HTML character code, which shows the character and never formats, links or starts math.
export const escapeMarkdown = (text: string) =>
  text.replace(/\r?\n/g, " ").replace(SPECIAL_CHARACTERS, character => `&#${character.charCodeAt(0)};`);

export const toMarkdownTable = (headers: string[], rows: string[][]) =>
  [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map(row => `| ${row.map(escapeMarkdown).join(" | ")} |`),
  ].join("\n");
