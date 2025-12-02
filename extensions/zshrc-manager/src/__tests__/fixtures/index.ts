/**
 * Test fixtures index
 *
 * Centralized test data factories to reduce duplication
 */

export * from "./sections";

/**
 * Helper to create zshrc content from sections
 */
export function createZshrcContent(sections: Array<{ label?: string; content: string }>): string {
  return sections
    .map((section) => {
      if (section.label) {
        return `# Section: ${section.label}\n${section.content}`;
      }
      return section.content;
    })
    .join("\n\n");
}

/**
 * Helper to create alias strings
 */
export function createAlias(name: string, command: string): string {
  return `alias ${name}='${command}'`;
}

/**
 * Helper to create export strings
 */
export function createExport(variable: string, value: string): string {
  return `export ${variable}=${value}`;
}

/**
 * Helper to create large content for performance testing
 */
export function createLargeContent(size: number): string {
  return Array.from({ length: size }, (_, i) => createAlias(`test${i}`, `echo ${i}`)).join("\n");
}
