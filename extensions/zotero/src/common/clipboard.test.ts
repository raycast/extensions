import { describe, it, expect, vi, beforeEach } from "vitest";

const api = vi.hoisted(() => ({
  copy: vi.fn(),
  paste: vi.fn(),
  showHUD: vi.fn(),
  showToast: vi.fn(),
  popToRoot: vi.fn(),
}));
const references = vi.hoisted(() => ({
  generateReference: vi.fn(),
  generateBibtexReference: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  Clipboard: { copy: api.copy, paste: api.paste },
  showHUD: api.showHUD,
  showToast: api.showToast,
  popToRoot: api.popToRoot,
  Toast: { Style: { Failure: "failure" } },
}));
vi.mock("./references", () => references);

import { exportRef, exportRefPaste, exportBibtexRefPaste, exportPandocKeyPaste } from "./clipboard";

beforeEach(() => vi.clearAllMocks());

describe("exporting a reference that can be generated", () => {
  it("copies the reference and then confirms", async () => {
    references.generateReference.mockResolvedValue("[1] I. Newton, Principia, 1687.");

    await exportRef("newton1687principia");

    expect(api.copy).toHaveBeenCalledWith("[1] I. Newton, Principia, 1687.");
    expect(api.showHUD).toHaveBeenCalledWith("Copied to Clipboard");
    expect(api.copy.mock.invocationCallOrder[0]).toBeLessThan(api.showHUD.mock.invocationCallOrder[0]);
    expect(api.showToast).not.toHaveBeenCalled();
  });

  it("pastes the reference and then confirms", async () => {
    references.generateReference.mockResolvedValue("[1] I. Newton, Principia, 1687.");

    await exportRefPaste("newton1687principia");

    expect(api.paste).toHaveBeenCalledWith("[1] I. Newton, Principia, 1687.");
    expect(api.showHUD).toHaveBeenCalledWith("Pasted to App");
    expect(api.paste.mock.invocationCallOrder[0]).toBeLessThan(api.showHUD.mock.invocationCallOrder[0]);
    expect(api.popToRoot).toHaveBeenCalled();
  });

  it("pastes a pandoc citation key without reading the library", async () => {
    await exportPandocKeyPaste("newton1687principia");

    expect(api.paste).toHaveBeenCalledWith("[@newton1687principia]");
    expect(api.showHUD).toHaveBeenCalledWith("Pasted to App");
  });
});

describe("exporting a reference that cannot be generated", () => {
  it("reports the reason instead of claiming success", async () => {
    references.generateReference.mockRejectedValue(
      new Error('~/Zotero/lib.json does not exist. Set "Better Bibtex CSL JSON File" in the extension settings.'),
    );

    await exportRefPaste("newton1687principia");

    expect(api.paste).not.toHaveBeenCalled();
    expect(api.showHUD).not.toHaveBeenCalled();
    expect(api.showToast).toHaveBeenCalledWith({
      style: "failure",
      title: "Could not generate the reference",
      message: '~/Zotero/lib.json does not exist. Set "Better Bibtex CSL JSON File" in the extension settings.',
    });
  });

  it("does not paste an empty bibtex reference", async () => {
    references.generateBibtexReference.mockRejectedValue(new Error("Bibtex entry newton1687principia can't be found"));

    await exportBibtexRefPaste("newton1687principia");

    expect(api.paste).not.toHaveBeenCalled();
    expect(api.showHUD).not.toHaveBeenCalled();
    expect(api.showToast).toHaveBeenCalledOnce();
  });
});
