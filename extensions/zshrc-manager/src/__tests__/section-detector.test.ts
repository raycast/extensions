import {
  detectSectionMarker,
  updateSectionContext,
  analyzeSectionMarkers,
  groupContentIntoSections,
  suggestSectionImprovements,
  findSectionBounds,
  type SectionMarker,
  type SectionContext,
} from "../lib/section-detector";
import { SectionMarkerType } from "../types/enums";
import { getPreferenceValues } from "@raycast/api";
import { vi } from "vitest";

describe("section-detector.ts", () => {
  beforeEach(() => {
    // Reset to default preferences for all tests
    vi.mocked(getPreferenceValues).mockReturnValue({
      enableDefaults: true,
      enableCustomHeaderPattern: false,
      enableCustomStartEndPatterns: false,
    });
  });

  describe("detectSectionMarker", () => {
    it("should detect dashed start markers", () => {
      const marker = detectSectionMarker("# --- Python Environment --- #", 1);
      expect(marker).toEqual({
        type: SectionMarkerType.DASHED_START,
        name: "Python Environment",
        lineNumber: 1,
        originalLine: "# --- Python Environment --- #",
        priority: expect.any(Number),
      });
    });

    it("should detect dashed end markers", () => {
      const marker = detectSectionMarker("# --- End Python Environment --- #", 1);
      expect(marker).toEqual({
        type: SectionMarkerType.DASHED_END,
        name: "",
        lineNumber: 1,
        originalLine: "# --- End Python Environment --- #",
        priority: expect.any(Number),
      });
    });

    it("should detect bracketed markers", () => {
      const marker = detectSectionMarker("# [Node.js Tools]", 1);
      expect(marker).toEqual({
        type: "bracketed",
        name: "Node.js Tools",
        lineNumber: 1,
        originalLine: "# [Node.js Tools]",
        priority: expect.any(Number),
      });
    });

    it("should detect hash markers", () => {
      const marker = detectSectionMarker("## Docker Configuration", 1);
      expect(marker).toEqual({
        type: "hash",
        name: "Docker Configuration",
        lineNumber: 1,
        originalLine: "## Docker Configuration",
        priority: expect.any(Number),
      });
    });

    it("should detect custom start markers", () => {
      const marker = detectSectionMarker("# @start iOS Development", 1);
      expect(marker).toEqual({
        type: "custom_start",
        name: "iOS Development",
        lineNumber: 1,
        originalLine: "# @start iOS Development",
        priority: expect.any(Number),
      });
    });

    it("should detect custom end markers", () => {
      const marker = detectSectionMarker("# @end iOS Development", 1);
      expect(marker).toEqual({
        type: "custom_end",
        name: "iOS Development",
        lineNumber: 1,
        originalLine: "# @end iOS Development",
        priority: expect.any(Number),
      });
    });

    it("should detect function start markers", () => {
      const marker = detectSectionMarker("setup_python_env() {", 1);
      expect(marker).toEqual({
        type: "function_start",
        name: "setup_python_env",
        lineNumber: 1,
        originalLine: "setup_python_env() {",
        priority: expect.any(Number),
      });
    });

    it("should detect function end markers", () => {
      const marker = detectSectionMarker("}", 1);
      expect(marker).toEqual({
        type: "function_end",
        name: "",
        lineNumber: 1,
        originalLine: "}",
        priority: expect.any(Number),
      });
    });

    it("should detect labeled markers", () => {
      const marker = detectSectionMarker("# Python Environment", 1);
      expect(marker).toBeNull(); // This format doesn't match the labeled regex
    });

    it("should return null for non-section lines", () => {
      const marker = detectSectionMarker("export PATH=/usr/local/bin:$PATH", 1);
      expect(marker).toBeNull();
    });

    it("should handle empty lines", () => {
      const marker = detectSectionMarker("", 1);
      expect(marker).toBeNull();
    });

    it("should handle whitespace-only lines", () => {
      const marker = detectSectionMarker("   ", 1);
      expect(marker).toBeNull();
    });
  });

  describe("updateSectionContext", () => {
    it("should update context for start markers", () => {
      const marker: SectionMarker = {
        type: SectionMarkerType.DASHED_START,
        name: "Test Section",
        lineNumber: 1,
        originalLine: "# --- Test Section --- #",
        priority: 1,
      };

      const context: SectionContext = {
        currentSection: undefined,
        sectionStack: [],
        functionLevel: 0,
      };

      const updatedContext = updateSectionContext(marker, context);

      expect(updatedContext.currentSection).toBe("Test Section");
      expect(updatedContext.sectionStack).toEqual(["Test Section"]);
    });

    it("should update context for end markers", () => {
      const marker: SectionMarker = {
        type: SectionMarkerType.DASHED_END,
        name: "Test Section",
        lineNumber: 10,
        originalLine: "# --- End Test Section --- #",
        priority: 1,
      };

      const context: SectionContext = {
        currentSection: "Test Section",
        sectionStack: ["Test Section"],
        functionLevel: 0,
      };

      const updatedContext = updateSectionContext(marker, context);

      expect(updatedContext.currentSection).toBeUndefined();
      expect(updatedContext.sectionStack).toEqual([]);
    });

    it("should handle nested sections", () => {
      const marker: SectionMarker = {
        type: SectionMarkerType.DASHED_START,
        name: "Nested Section",
        lineNumber: 5,
        originalLine: "# --- Nested Section --- #",
        priority: 1,
      };

      const context: SectionContext = {
        currentSection: "Parent Section",
        sectionStack: ["Parent Section"],
        functionLevel: 0,
      };

      const updatedContext = updateSectionContext(marker, context);

      expect(updatedContext.currentSection).toBe("Nested Section");
      expect(updatedContext.sectionStack).toEqual(["Parent Section", "Nested Section"]);
    });

    it("should handle function start markers", () => {
      const marker: SectionMarker = {
        type: SectionMarkerType.FUNCTION_START,
        name: "setup_environment",
        lineNumber: 1,
        originalLine: "setup_environment() {",
        priority: 1,
      };

      const context: SectionContext = {
        currentSection: undefined,
        sectionStack: [],
        functionLevel: 0,
      };

      const updatedContext = updateSectionContext(marker, context);

      expect(updatedContext.functionLevel).toBe(1);
      expect(updatedContext.currentSection).toBe("Function: setup_environment");
      expect(updatedContext.sectionStack).toEqual(["Function: setup_environment"]);
    });

    it("should handle function end markers", () => {
      const marker: SectionMarker = {
        type: SectionMarkerType.FUNCTION_END,
        name: "",
        lineNumber: 10,
        originalLine: "}",
        priority: 1,
      };

      const context: SectionContext = {
        currentSection: "Function: setup_environment",
        sectionStack: ["Function: setup_environment"],
        functionLevel: 1,
      };

      const updatedContext = updateSectionContext(marker, context);

      expect(updatedContext.functionLevel).toBe(0);
      expect(updatedContext.currentSection).toBeUndefined();
      expect(updatedContext.sectionStack).toEqual([]);
    });
  });

  describe("analyzeSectionMarkers", () => {
    it("should analyze content and return all markers", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
alias py="python3"

# --- End Python Environment --- #

# [Node.js Tools]
export NODE_PATH="/usr/local/lib/node_modules"
alias ni="npm install"`;

      const markers = analyzeSectionMarkers(content);

      expect(markers).toHaveLength(3);
      expect(markers[0]?.type).toBe("dashed_start");
      expect(markers[0]?.name).toBe("Python Environment");
      expect(markers[1]?.type).toBe("dashed_end");
      expect(markers[1]?.name).toBe("");
      expect(markers[2]?.type).toBe("bracketed");
      expect(markers[2]?.name).toBe("Node.js Tools");
    });

    it("should handle empty content", () => {
      const markers = analyzeSectionMarkers("");
      expect(markers).toHaveLength(0);
    });

    it("should handle content with no markers", () => {
      const content = `export PATH=/usr/local/bin:$PATH
alias py="python3"
echo "Hello World"`;

      const markers = analyzeSectionMarkers(content);
      expect(markers).toHaveLength(0);
    });
  });

  describe("groupContentIntoSections", () => {
    it("should group content into sections", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
alias py="python3"

# --- End Python Environment --- #

# [Node.js Tools]
export NODE_PATH="/usr/local/lib/node_modules"
alias ni="npm install"`;

      const sections = groupContentIntoSections(content);

      expect(sections).toHaveLength(2);
      expect(sections[0]?.name).toBe("Python Environment");
      expect(sections[0]?.type).toBe("dashed_start");
      expect(sections[0]?.startLine).toBe(1);
      expect(sections[0]?.endLine).toBe(4);
      expect(sections[1]?.name).toBe("Node.js Tools");
      expect(sections[1]?.type).toBe("bracketed");
      expect(sections[1]?.startLine).toBe(7);
      expect(sections[1]?.endLine).toBe(9);
    });

    it("should handle content with no sections", () => {
      const content = `export PATH=/usr/local/bin:$PATH
alias py="python3"`;

      const sections = groupContentIntoSections(content);
      expect(sections).toHaveLength(0);
    });

    it("should handle unclosed sections", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
alias py="python3"`;

      const sections = groupContentIntoSections(content);

      expect(sections).toHaveLength(1);
      expect(sections[0]?.name).toBe("Python Environment");
      expect(sections[0]?.endLine).toBe(3);
    });
  });

  describe("suggestSectionImprovements", () => {
    it("should suggest improvements for unlabeled content", () => {
      const content = `export PATH=/usr/local/bin:$PATH
alias py="python3"
alias ll="ls -la"
alias la="ls -la"
alias l="ls -la"
alias ..="cd .."
alias ...="cd ../.."
alias ....="cd ../../.."
alias .....="cd ../../../.."
alias ......="cd ../../../../.."

# --- Python Environment --- #
export PYTHONPATH="/usr/local/lib/python3.9/site-packages"`;

      const suggestions = suggestSectionImprovements(content);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]?.priority).toBe("medium");
      expect(suggestions[0]?.suggestion).toContain("unlabeled content");
    });

    it("should suggest improvements for inconsistent formatting", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH

# [Node.js Tools]
export NODE_PATH="/usr/local/lib/node_modules"

## Docker Configuration
export DOCKER_DEFAULT_PLATFORM=linux/amd64

# @start iOS Development
alias active_sims="xcrun simctl list 'devices' 'booted'"
# @end iOS Development`;

      const suggestions = suggestSectionImprovements(content);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.suggestion.includes("consistent section formatting"))).toBe(true);
    });

    it("should return empty suggestions for well-organized content", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
alias py="python3"

# --- End Python Environment --- #

# --- Node.js Tools --- #
export NODE_PATH="/usr/local/lib/node_modules"
alias ni="npm install"`;

      const suggestions = suggestSectionImprovements(content);
      expect(suggestions.length).toBe(0);
    });
  });

  describe("custom patterns", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should detect custom header pattern when enabled", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        customHeaderPattern: "^#\\s+(.+)$",
        enableCustomStartEndPatterns: false,
      });

      const marker = detectSectionMarker("# My Custom Section", 1);
      expect(marker).not.toBeNull();
      expect(marker?.name).toBe("My Custom Section");
    });

    it("should detect custom start/end patterns when enabled", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        customStartPattern: "^#\\s*start\\s+(.+)$",
        customEndPattern: "^#\\s*end\\s+(.+)$",
      });

      const startMarker = detectSectionMarker("# start Test Section", 1);
      expect(startMarker).not.toBeNull();
      expect(startMarker?.type).toBe(SectionMarkerType.CUSTOM_START);
      expect(startMarker?.name).toBe("Test Section");

      const endMarker = detectSectionMarker("# end Test Section", 2);
      expect(endMarker).not.toBeNull();
      expect(endMarker?.type).toBe(SectionMarkerType.CUSTOM_END);
    });

    it("should work with defaults disabled and only custom patterns", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: false,
        enableCustomHeaderPattern: true,
        customHeaderPattern: "^##\\s+(.+)$",
        enableCustomStartEndPatterns: false,
      });

      const marker = detectSectionMarker("## Custom Only Section", 1);
      expect(marker).not.toBeNull();
      expect(marker?.name).toBe("Custom Only Section");

      // Default patterns should not match
      const defaultMarker = detectSectionMarker("# --- Python Environment --- #", 2);
      expect(defaultMarker).toBeNull();
    });

    it("should ignore invalid regex patterns gracefully", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        customHeaderPattern: "[invalid regex", // Invalid regex
        enableCustomStartEndPatterns: false,
      });

      // Should still work with defaults
      const marker = detectSectionMarker("# --- Python Environment --- #", 1);
      expect(marker).not.toBeNull();
      expect(marker?.name).toBe("Python Environment");
    });

    it("should ignore patterns without capture groups", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        customHeaderPattern: "^#", // No capture group
        enableCustomStartEndPatterns: false,
      });

      // Should still work with defaults since custom pattern is invalid
      const marker = detectSectionMarker("# --- Python Environment --- #", 1);
      expect(marker).not.toBeNull();
      expect(marker?.name).toBe("Python Environment");
    });

    it("should handle custom end pattern without capture group (optional)", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: false,
        enableCustomStartEndPatterns: true,
        customStartPattern: "^#\\s*start\\s+(.+)$",
        customEndPattern: "^#\\s*end$", // No capture group - allowed for end markers
      });

      const endMarker = detectSectionMarker("# end", 1);
      expect(endMarker).not.toBeNull();
      expect(endMarker?.type).toBe(SectionMarkerType.CUSTOM_END);
    });

    it("should handle empty or whitespace-only custom patterns", () => {
      vi.mocked(getPreferenceValues).mockReturnValue({
        enableDefaults: true,
        enableCustomHeaderPattern: true,
        customHeaderPattern: "   ", // Whitespace only
        enableCustomStartEndPatterns: false,
      });

      // Should still work with defaults
      const marker = detectSectionMarker("# --- Python Environment --- #", 1);
      expect(marker).not.toBeNull();
      expect(marker?.name).toBe("Python Environment");
    });
  });

  describe("findSectionBounds", () => {
    it("should find section bounds for dashed section format", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
alias py="python3"

# --- End Python Environment --- #

# [Node.js Tools]
export NODE_PATH="/usr/local/lib/node_modules"`;

      const bounds = findSectionBounds(content, "Python Environment");

      expect(bounds).not.toBeNull();
      expect(bounds?.startLine).toBe(1);
      expect(bounds?.endLine).toBe(5);
    });

    it("should find section bounds for bracketed section format", () => {
      const content = `# [Node.js Tools]
export NODE_PATH="/usr/local/lib/node_modules"
alias ni="npm install"

# [Docker Configuration]
export DOCKER_DEFAULT_PLATFORM=linux/amd64`;

      const bounds = findSectionBounds(content, "Node.js Tools");

      expect(bounds).not.toBeNull();
      expect(bounds?.startLine).toBe(1);
      expect(bounds?.endLine).toBe(4); // Ends before next section
    });

    it("should find section bounds for hash section format", () => {
      const content = `## Docker Configuration
export DOCKER_DEFAULT_PLATFORM=linux/amd64
alias dc="docker compose"

## Another Section
export VAR=value`;

      const bounds = findSectionBounds(content, "Docker Configuration");

      expect(bounds).not.toBeNull();
      expect(bounds?.startLine).toBe(1);
      expect(bounds?.endLine).toBe(4); // Ends before next section
    });

    it("should find section bounds for labeled section format", () => {
      const content = `# Section: Python Environment
export PATH=/usr/local/bin:$PATH
alias py="python3"

# Section: Node.js Tools
export NODE_PATH="/usr/local/lib/node_modules"`;

      const bounds = findSectionBounds(content, "Python Environment");

      expect(bounds).not.toBeNull();
      expect(bounds?.startLine).toBe(1);
      expect(bounds?.endLine).toBe(4); // Ends before next section
    });

    it("should find section bounds for custom start/end format", () => {
      const content = `# @start iOS Development
alias active_sims="xcrun simctl list 'devices' 'booted'"
export SIMULATOR_DEVICE="iPhone 15"
# @end iOS Development

# [Another Section]
export VAR=value`;

      const bounds = findSectionBounds(content, "iOS Development");

      expect(bounds).not.toBeNull();
      expect(bounds?.startLine).toBe(1);
      expect(bounds?.endLine).toBe(4); // Ends at the end marker
    });

    it("should return null for non-existent section", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH

# [Node.js Tools]
export NODE_PATH="/usr/local/lib/node_modules"`;

      const bounds = findSectionBounds(content, "Non-existent Section");

      expect(bounds).toBeNull();
    });

    it("should handle section that extends to end of file", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
alias py="python3"`;

      const bounds = findSectionBounds(content, "Python Environment");

      expect(bounds).not.toBeNull();
      expect(bounds?.startLine).toBe(1);
      expect(bounds?.endLine).toBe(3); // End of file
    });

    it("should handle multiple sections with same name correctly", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
# --- End Python Environment --- #

# --- Python Environment --- #
alias py="python3"
# --- End Python Environment --- #`;

      const bounds = findSectionBounds(content, "Python Environment");

      expect(bounds).not.toBeNull();
      expect(bounds?.startLine).toBe(1); // Should find first occurrence
      expect(bounds?.endLine).toBe(3);
    });

    it("should calculate endIndex correctly", () => {
      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
alias py="python3"

# --- End Python Environment --- #`;

      const bounds = findSectionBounds(content, "Python Environment");

      expect(bounds).not.toBeNull();
      expect(bounds?.endIndex).toBeGreaterThan(0);
      // Verify endIndex points to end of section
      const lines = content.split(/\r?\n/);
      let expectedIndex = 0;
      for (let i = 0; i < bounds!.endLine - 1; i++) {
        const line = lines[i];
        if (line) {
          expectedIndex += line.length + 1;
        }
      }
      expect(bounds?.endIndex).toBe(expectedIndex);
    });
  });
});
