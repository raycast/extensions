import { describe, it, expect } from "vitest";

describe("alias/export patterns", () => {
  it("alias pattern matches quoted, unquoted, and with comments", () => {
    // Pattern from edit-alias.tsx
    const generatePattern = (name: string) =>
      new RegExp(`^(\\s*)alias\\s+${name}\\s*=\\s*([^\\\n#]*?)(\\s*#.*)?$`, "gm");
    const content = ["alias ll='ls -la'", "alias ll=ls -la", 'alias ll = "ls -la" # comment'].join("\n");

    const pattern = generatePattern("ll");
    const matches = content.match(pattern);

    expect(matches).toBeTruthy();
    expect(matches!.length).toBe(3);
  });

  it("export pattern matches quoted, unquoted, and with comments", () => {
    // Pattern from edit-export.tsx
    const generatePattern = (variable: string) =>
      new RegExp(`^(\\s*)(?:export|typeset\\s+-x)\\s+${variable}\\s*=\\s*([^\\\n#]*?)(\\s*#.*)?$`, "gm");
    const content = [
      'export PATH="/usr/local/bin:$PATH"',
      "export PATH=/usr/local/bin:$PATH",
      "typeset -x PATH=/usr/local/bin # comment",
    ].join("\n");

    const pattern = generatePattern("PATH");
    const matches = content.match(pattern);

    expect(matches).toBeTruthy();
    expect(matches!.length).toBe(3);
  });
});
