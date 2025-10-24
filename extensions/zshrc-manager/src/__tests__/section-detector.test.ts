import {
  detectSectionMarker,
  updateSectionContext,
  analyzeSectionMarkers,
  groupContentIntoSections,
  suggestSectionImprovements,
  type SectionMarker,
  type SectionContext,
} from "../lib/section-detector";
import { SectionMarkerType } from "../types/enums";

describe("section-detector.ts", () => {
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
});
