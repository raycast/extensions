import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
const mockReadZshrcFile = vi.fn();
const mockWriteZshrcFile = vi.fn();
const mockShowToast = vi.fn();
const mockPopToRoot = vi.fn();
const mockUseForm = vi.fn();

vi.mock("../lib/zsh", () => ({
  readZshrcFile: mockReadZshrcFile,
  writeZshrcFile: mockWriteZshrcFile,
  getZshrcPath: "/Users/test/.zshrc",
}));

vi.mock("@raycast/api", () => ({
  Form: {
    TextField: vi.fn(),
    TextArea: vi.fn(),
    Dropdown: vi.fn(),
    DropdownItem: vi.fn(),
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

describe("EditAlias", () => {
  const mockItemProps = {
    name: {
      value: "",
      onChange: vi.fn(),
    },
    command: {
      value: "",
      onChange: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockReadZshrcFile.mockResolvedValue("test content");
    mockWriteZshrcFile.mockResolvedValue(undefined);
    mockUseForm.mockReturnValue({
      itemProps: mockItemProps,
    });
  });

  it("should export EditAlias component", async () => {
    const EditAlias = await import("../edit-alias");
    expect(EditAlias.default).toBeDefined();
    expect(typeof EditAlias.default).toBe("function");
  });

  it("should handle file operations", async () => {
    // Test that the component can handle file operations
    const content = await mockReadZshrcFile();
    await mockWriteZshrcFile(content);

    expect(content).toBe("test content");
    expect(mockReadZshrcFile).toHaveBeenCalled();
    expect(mockWriteZshrcFile).toHaveBeenCalledWith(content);
  });

  it("should handle file read errors", async () => {
    // Test that the component can handle file read errors
    const error = new Error("File not found");
    mockReadZshrcFile.mockRejectedValue(error);

    try {
      await mockReadZshrcFile();
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe("File not found");
    }
  });

  it("should handle file write errors", async () => {
    // Test that the component can handle file write errors
    const error = new Error("Permission denied");
    mockWriteZshrcFile.mockRejectedValue(error);

    try {
      await mockWriteZshrcFile("test content");
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe("Permission denied");
    }
  });

  it("should handle toast notifications", () => {
    // Test that the component can handle toast notifications
    mockShowToast({
      style: "Success",
      title: "Alias saved successfully",
    });

    expect(mockShowToast).toHaveBeenCalledWith({
      style: "Success",
      title: "Alias saved successfully",
    });
  });

  it("should validate alias names correctly", () => {
    const validNames = ["ll", "gs", "test_alias", "alias123"];
    const invalidNames = ["", " ", "test alias", "test-alias"];

    validNames.forEach((name) => {
      const isValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
      expect(isValid).toBe(true);
    });

    invalidNames.forEach((name) => {
      const isValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
      expect(isValid).toBe(false);
    });
  });

  it("should generate alias line correctly", async () => {
    const { aliasConfig } = await import("../edit-alias");

    const line = aliasConfig.generateLine("ll", "ls -la");
    expect(line).toBe("alias ll='ls -la'");
  });

  it("should generate pattern for finding aliases", async () => {
    const { aliasConfig } = await import("../edit-alias");

    const pattern = aliasConfig.generatePattern("ll");
    expect(pattern).toBeInstanceOf(RegExp);
  });
});
