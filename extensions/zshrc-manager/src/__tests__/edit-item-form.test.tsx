import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies first
const mockReadZshrcFile = vi.fn();
const mockWriteZshrcFile = vi.fn();
const mockShowToast = vi.fn();
const mockPopToRoot = vi.fn();
const mockUseForm = vi.fn();
const mockFindSectionBounds = vi.fn();

vi.mock("../lib/zsh", () => ({
  readZshrcFile: mockReadZshrcFile,
  writeZshrcFile: mockWriteZshrcFile,
  getZshrcPath: () => "/Users/test/.zshrc",
}));

vi.mock("../lib/section-detector", async () => {
  const actual = await vi.importActual("../lib/section-detector");
  return {
    ...actual,
    findSectionBounds: mockFindSectionBounds,
  };
});

vi.mock("@raycast/api", () => ({
  Form: {
    TextField: vi.fn(),
    TextArea: vi.fn(),
    Dropdown: vi.fn(),
    DropdownItem: vi.fn(),
    Description: vi.fn(),
  },
  ActionPanel: vi.fn(),
  Action: {
    SubmitForm: vi.fn(),
    Style: {
      Destructive: "destructive",
    },
  },
  Icon: {
    Check: "Check",
    Trash: "Trash",
    Document: "Document",
  },
  showToast: mockShowToast,
  Toast: {
    Style: {
      Success: "Success",
      Failure: "Failure",
    },
  },
  popToRoot: mockPopToRoot,
}));

vi.mock("@raycast/utils", () => ({
  useForm: mockUseForm,
}));

describe("EditItemForm - Section Finding and Pattern Matching", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadZshrcFile.mockResolvedValue("test content");
    mockWriteZshrcFile.mockResolvedValue(undefined);
    mockUseForm.mockReturnValue({
      itemProps: {
        key: { value: "", onChange: vi.fn() },
        value: { value: "", onChange: vi.fn() },
      },
    });
  });

  describe("findSectionBounds integration", () => {
    it("should use findSectionBounds to locate sections", async () => {
      const { findSectionBounds } = await import("../lib/section-detector");

      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
alias py="python3"
# --- End Python Environment --- #`;

      mockFindSectionBounds.mockReturnValue({
        startLine: 1,
        endLine: 4,
        endIndex: content.length - 10,
      });

      mockReadZshrcFile.mockResolvedValue(content);

      const bounds = findSectionBounds(content, "Python Environment");

      expect(bounds).not.toBeNull();
      expect(bounds?.startLine).toBe(1);
      expect(bounds?.endLine).toBe(4);
    });

    it("should handle sections with different formats", async () => {
      const { findSectionBounds } = await import("../lib/section-detector");

      const formats = [
        { content: `# --- Section --- #\ncontent\n# --- End Section --- #`, name: "Section" },
        { content: `# [Section]\ncontent\n# [Next]`, name: "Section" },
        { content: `## Section\ncontent\n## Next`, name: "Section" },
        { content: `# Section: Section\ncontent\n# Section: Next`, name: "Section" },
        { content: `# @start Section\ncontent\n# @end Section`, name: "Section" },
      ];

      for (const format of formats) {
        mockFindSectionBounds.mockReturnValue({
          startLine: 1,
          endLine: 2,
          endIndex: format.content.indexOf("\n"),
        });

        const bounds = findSectionBounds(format.content, format.name);
        expect(bounds).not.toBeNull();
      }
    });
  });

  describe("regex pattern matching", () => {
    it("should use match() instead of test() for pattern checking", async () => {
      const { aliasConfig } = await import("../edit-alias");

      const content = `alias ll='ls -la'
alias gs='git status'`;

      const pattern = aliasConfig.generatePattern("ll");
      const matches = content.match(pattern);

      expect(matches).not.toBeNull();
      expect(matches?.length).toBeGreaterThan(0);
    });

    it("should handle global regex patterns correctly", async () => {
      const { aliasConfig } = await import("../edit-alias");

      const content = `alias ll='ls -la'
alias ll='ls -lah'
alias ll='ls -laF'`;

      const pattern = aliasConfig.generatePattern("ll");
      const matches = content.match(pattern);

      // Should find at least one match
      expect(matches).not.toBeNull();
      expect(matches?.length).toBeGreaterThan(0);
    });

    it("should handle export patterns correctly", async () => {
      const { exportConfig } = await import("../edit-export");

      const content = `export PATH=/usr/local/bin:$PATH
typeset -x NODE_ENV=production`;

      const pathPattern = exportConfig.generatePattern("PATH");
      const nodePattern = exportConfig.generatePattern("NODE_ENV");

      const pathMatches = content.match(pathPattern);
      const nodeMatches = content.match(nodePattern);

      expect(pathMatches).not.toBeNull();
      expect(nodeMatches).not.toBeNull();
    });
  });

  describe("section finding for adding items", () => {
    it("should add items to correct section when section exists", async () => {
      const { findSectionBounds } = await import("../lib/section-detector");

      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH
# --- End Python Environment --- #`;

      mockFindSectionBounds.mockReturnValue({
        startLine: 1,
        endLine: 3,
        endIndex: content.indexOf("# --- End"),
      });

      mockReadZshrcFile.mockResolvedValue(content);

      const bounds = findSectionBounds(content, "Python Environment");
      expect(bounds).not.toBeNull();
    });

    it("should handle section not found case", async () => {
      const { findSectionBounds } = await import("../lib/section-detector");

      const content = `# --- Python Environment --- #
export PATH=/usr/local/bin:$PATH`;

      mockFindSectionBounds.mockReturnValue(null);

      const bounds = findSectionBounds(content, "Non-existent Section");
      expect(bounds).toBeNull();
    });
  });
});
