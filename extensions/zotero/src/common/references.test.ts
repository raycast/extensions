import { beforeEach, expect, it, vi } from "vitest";

const io = vi.hoisted(() => ({ readFile: vi.fn(), preferences: vi.fn() }));
vi.mock("@raycast/api", () => ({
  getPreferenceValues: io.preferences,
  environment: { assetsPath: "/fixtures/assets" },
}));
vi.mock("fs/promises", () => ({ readFile: io.readFile }));
vi.mock("./zoteroApi", () => ({ resolveHome: (value: string) => value.replace(/^~/, "/home/test") }));
import { generateReference, generateBibtexReference } from "./references";

const style = `<style xmlns="http://purl.org/net/xbiblio/csl" class="note" version="1.0">
  <info><title>Note</title><id>note-pipeline</id><updated>2026-01-01T00:00:00Z</updated></info>
  <citation><layout prefix="Note: "><text variable="title"/></layout></citation>
  <bibliography><layout prefix="Bibliography: "><text variable="title"/></layout></bibliography>
</style>`;

beforeEach(() => {
  vi.resetAllMocks();
  io.preferences.mockReturnValue({
    zotero_path: "~/Zotero/zotero.sqlite",
    bibtex_path: "~/Zotero/library.json",
    csl_style: "ieee",
  });
  io.readFile.mockImplementation(async (path: string) => {
    if (path.endsWith(".xml")) return '<locale xmlns="http://purl.org/net/xbiblio/csl" version="1.0"/>';
    return Buffer.from(path.endsWith(".csl") ? style : JSON.stringify([{ id: "key", type: "book", title: "Sample" }]));
  });
});

it("retains installed style and bibliography defaults without reading bundled locales", async () => {
  expect(await generateReference("key")).toBe("Bibliography: Sample\n");
  expect(io.readFile.mock.calls.map((args) => args[0])).toEqual([
    "/home/test/Zotero/styles/ieee.csl",
    "/home/test/Zotero/library.json",
  ]);
});

it("reads a home-relative custom path and explicitly selected note output", async () => {
  io.preferences.mockReturnValue({
    ...io.preferences(),
    csl_source: "custom",
    custom_csl_path: "~/styles/my-note.csl",
    reference_output: "note",
  });
  expect(await generateReference("key")).toBe("Note: Sample");
  expect(io.readFile).toHaveBeenCalledWith("/home/test/styles/my-note.csl");
  expect(io.readFile).toHaveBeenCalledWith("/fixtures/assets/locales/locales-zh-CN.xml", "utf8");
  expect(io.readFile).toHaveBeenCalledWith("/fixtures/assets/locales/locales-ja-JP.xml", "utf8");
});

it("keeps BibTeX independent of CSL source, file and output settings", async () => {
  io.preferences.mockReturnValue({ ...io.preferences(), csl_source: "custom", reference_output: "note" });
  expect(await generateBibtexReference("key")).toContain("Sample");
  expect(io.readFile.mock.calls.map((args) => args[0])).toEqual(["/home/test/Zotero/library.json"]);
});

it("keeps actionable missing-file errors for both style sources", async () => {
  io.readFile.mockRejectedValue(Object.assign(new Error("missing"), { code: "ENOENT" }));
  await expect(generateReference("key")).rejects.toThrow("Install the ieee style");
  io.preferences.mockReturnValue({ ...io.preferences(), csl_source: "custom", custom_csl_path: "~/missing.csl" });
  await expect(generateReference("key")).rejects.toThrow('Update "Custom CSL File"');
});

it("keeps invalid JSON and missing-entry errors", async () => {
  io.readFile.mockResolvedValue(Buffer.from("not json"));
  await expect(generateBibtexReference("key")).rejects.toThrow("is not valid JSON");
  io.readFile.mockResolvedValue(Buffer.from("[]"));
  await expect(generateBibtexReference("key")).rejects.toThrow("can't be found");
});

it("includes the selected file when a style cannot be formatted", async () => {
  io.readFile.mockImplementation(async (path: string) =>
    Buffer.from(path.endsWith(".csl") ? style.replace('class="note"', 'class="in-text"') : "[]"),
  );
  io.preferences.mockReturnValue({ ...io.preferences(), reference_output: "note" });
  io.readFile.mockImplementationOnce(async () => Buffer.from(style.replace('class="note"', 'class="in-text"')));
  io.readFile.mockImplementationOnce(async () => Buffer.from('[{"id":"key","type":"book","title":"Sample"}]'));
  await expect(generateReference("key")).rejects.toThrow("Could not format reference with ~/Zotero/styles/ieee.csl");
});
