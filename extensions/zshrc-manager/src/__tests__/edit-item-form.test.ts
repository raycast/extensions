import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks
const mockUseForm = vi.fn();
const mockShowToast = vi.fn();
const mockPopToRoot = vi.fn();
const mockReadZshrcFileRaw = vi.fn();
const mockWriteZshrcFile = vi.fn();
const mockGetZshrcPath = vi.fn();
const mockClearCache = vi.fn();

vi.mock("@raycast/utils", () => ({ useForm: mockUseForm }));
vi.mock("@raycast/api", () => ({
  Form: { TextField: vi.fn(), Description: vi.fn() },
  ActionPanel: vi.fn(),
  Action: { SubmitForm: vi.fn(), Open: vi.fn(), Style: { Destructive: "Destructive" } },
  Icon: { Check: "Check", Document: "Document", Trash: "Trash", Terminal: "Terminal" },
  Toast: { Style: { Success: "Success", Failure: "Failure" } },
  showToast: mockShowToast,
  popToRoot: mockPopToRoot,
  useNavigation: vi.fn(() => ({ pop: vi.fn(), push: vi.fn() })),
}));
vi.mock("../lib/zsh", () => ({
  readZshrcFileRaw: mockReadZshrcFileRaw,
  writeZshrcFile: mockWriteZshrcFile,
  getZshrcPath: mockGetZshrcPath,
}));
vi.mock("../lib/cache", () => ({ clearCache: mockClearCache }));
vi.mock("../lib/section-detector", () => ({ findSectionBounds: vi.fn() }));

describe("EditItemForm integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetZshrcPath.mockReturnValue("/Users/test/.zshrc");
    mockReadZshrcFileRaw.mockResolvedValue("alias ll='ls -la'\n");
    mockWriteZshrcFile.mockResolvedValue(undefined);

    // useForm mock captures onSubmit and returns itemProps
    mockUseForm.mockImplementation((args: { onSubmit?: (values: { key: string; value: string }) => Promise<void> }) => {
      (
        mockUseForm as { lastArgs?: { onSubmit?: (values: { key: string; value: string }) => Promise<void> } }
      ).lastArgs = args;
      return { itemProps: { key: {}, value: {} }, handleSubmit: vi.fn() };
    });
  });

  it("calls clearCache after successful edit", async () => {
    const { default: EditItemForm } = await import("../lib/edit-item-form");
    // Render function to trigger useForm
    EditItemForm({
      existingKey: "ll",
      existingValue: "ls -la",
      sectionLabel: undefined,
      onSave: vi.fn(),
      config: {
        keyLabel: "Alias Name",
        valueLabel: "Command",
        keyPlaceholder: "",
        valuePlaceholder: "",
        keyPattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
        keyValidationError: "",
        generateLine: (k: string, v: string) => `alias ${k}='${v}'`,
        generatePattern: (k: string) => new RegExp(`^alias\\s+${k}\\s*=.*$`, "m"),
        generateReplacement: (k: string, v: string) => `alias ${k}='${v}'`,
        itemType: "alias",
        itemTypeCapitalized: "Alias",
      },
    });

    const lastArgs = (
      mockUseForm as { lastArgs?: { onSubmit?: (values: { key: string; value: string }) => Promise<void> } }
    ).lastArgs;
    const onSubmit = lastArgs?.onSubmit;
    if (onSubmit) {
      await onSubmit({ key: "ll", value: "ls -la" });
    }

    expect(mockWriteZshrcFile).toHaveBeenCalled();
    expect(mockClearCache).toHaveBeenCalledWith("/Users/test/.zshrc");
  });
});
