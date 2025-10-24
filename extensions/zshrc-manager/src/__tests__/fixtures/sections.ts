/**
 * Test fixtures for creating mock sections
 */

import { LogicalSection } from "../../lib/parse-zshrc";

/**
 * Creates a mock section with sensible defaults
 */
export function createMockSection(overrides?: Partial<LogicalSection>): LogicalSection {
  return {
    label: "Test Section",
    content: "export TEST=value",
    startLine: 1,
    endLine: 10,
    aliasCount: 0,
    exportCount: 1,
    functionCount: 0,
    pluginCount: 0,
    sourceCount: 0,
    evalCount: 0,
    setoptCount: 0,
    autoloadCount: 0,
    fpathCount: 0,
    pathCount: 0,
    themeCount: 0,
    completionCount: 0,
    historyCount: 0,
    keybindingCount: 0,
    otherCount: 0,
    ...overrides,
  };
}

/**
 * Creates multiple mock sections
 */
export function createMockSections(count: number, overrides?: Partial<LogicalSection>): LogicalSection[] {
  return Array.from({ length: count }, (_, i) =>
    createMockSection({
      label: `Section ${i + 1}`,
      startLine: i * 10 + 1,
      endLine: (i + 1) * 10,
      ...overrides,
    }),
  );
}

/**
 * Creates a section with aliases
 */
export function createSectionWithAliases(count: number = 2): LogicalSection {
  const aliases = Array.from({ length: count }, (_, i) => `alias test${i}='echo ${i}'`).join("\n");
  return createMockSection({
    label: "Alias Section",
    content: aliases,
    aliasCount: count,
    exportCount: 0,
  });
}

/**
 * Creates a section with exports
 */
export function createSectionWithExports(count: number = 2): LogicalSection {
  const exports = Array.from({ length: count }, (_, i) => `export VAR${i}=value${i}`).join("\n");
  return createMockSection({
    label: "Export Section",
    content: exports,
    aliasCount: 0,
    exportCount: count,
  });
}

/**
 * Creates a section with functions
 */
export function createSectionWithFunctions(count: number = 2): LogicalSection {
  const functions = Array.from({ length: count }, (_, i) => `function test${i}() { echo ${i}; }`).join("\n");
  return createMockSection({
    label: "Function Section",
    content: functions,
    functionCount: count,
  });
}

/**
 * Creates a section with plugins
 */
export function createSectionWithPlugins(count: number = 2): LogicalSection {
  const plugins = Array.from({ length: count }, (_, i) => `plugin${i}`).join(" ");
  return createMockSection({
    label: "Plugin Section",
    content: `plugins=(${plugins})`,
    pluginCount: count,
  });
}

/**
 * Creates an empty section
 */
export function createEmptySection(): LogicalSection {
  return createMockSection({
    label: "Empty Section",
    content: "",
    aliasCount: 0,
    exportCount: 0,
    functionCount: 0,
    pluginCount: 0,
  });
}

/**
 * Creates a labeled section
 */
export function createLabeledSection(label: string): LogicalSection {
  return createMockSection({
    label,
    content: `# Section: ${label}\nexport TEST=value`,
  });
}

/**
 * Creates an unlabeled section
 */
export function createUnlabeledSection(): LogicalSection {
  return createMockSection({
    label: "Unlabeled",
    content: "export TEST=value",
  });
}

/**
 * Creates a section with mixed content
 */
export function createMixedSection(): LogicalSection {
  return createMockSection({
    label: "Mixed Section",
    content: "alias ll='ls -la'\nexport PATH=/usr/local/bin:$PATH\nfunction test() { echo 'test'; }",
    aliasCount: 1,
    exportCount: 1,
    functionCount: 1,
  });
}
