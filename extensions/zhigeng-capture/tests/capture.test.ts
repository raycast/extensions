import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdir, readFile, readdir, rm, rename, symlink, realpath } from "node:fs/promises";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { captureNote } from "../src/note-capture.js";
import { captureTodo } from "../src/todo-capture.js";
import * as preferences from "../src/preferences.js";

describe("standalone raw capture with isolated Vaults", () => {
  let root: string;
  let vault: string;
  beforeEach(async () => {
    root = join(tmpdir(), `zhigeng-raycast-${randomUUID()}`);
    vault = join(root, "vault");
    await mkdir(vault, { recursive: true });
    vi.spyOn(preferences, "getPreferences").mockReturnValue({ vaultPath: vault });
  });
  afterEach(async () => { vi.restoreAllMocks(); await rm(root, { recursive: true, force: true }); });

  it("preserves note text, YAML quoting, capture identity and an honest clock timezone", async () => {
    const result = await captureNote({ type: "note", title: 'x: "quoted"\nnext', project: "项目: A", body: "  first\n\nlast  \n", captureId: "cap-1" });
    const content = await readFile(result.filePath, "utf8");
    expect(content).toContain('title: "x: \\"quoted\\"\\nnext"');
    expect(content).toContain('project: "项目: A"');
    expect(content).toContain('capture_id: "cap-1"');
    expect(content).toContain('capture_schema: "zhigeng-capture/v1"');
    expect(content).toContain('capture_timezone: ');
    expect(content).toContain('---\n  first\n\nlast  \n\n');
    expect(await readdir(vault)).toEqual(["_raw"]);
  });

  it("writes even a single-line TODO to raw, including independent plan and deadline", async () => {
    const result = await captureTodo({ title: "", body: "do the task", project: "p", scheduled: "2026-11-07", due: "2026-11-09", priority: "high", captureId: "todo-1" });
    const content = await readFile(result.filePath, "utf8");
    for (const line of ['capture_type: "todo"', 'title: "do the task"', 'scheduled: "2026-11-07"', 'due: "2026-11-09"', 'priority: "high"']) expect(content).toContain(line);
    expect(content).not.toContain("task_id:");
    expect(await readdir(vault)).toEqual(["_raw"]);
  });

  it("reuses a stable ID across retries, including after the original is archived", async () => {
    const params = { title: "task", body: "task\n  original details  \n", captureId: "retry-1" };
    const first = await captureTodo(params);
    const bytes = await readFile(first.filePath);
    const archive = join(vault, "_raw", "_archived");
    await mkdir(archive);
    const archived = join(archive, basename(first.filePath));
    await rename(first.filePath, archived);
    const again = await captureTodo(params);
    expect(again.filePath).toBe(await realpath(archived));
    expect(await readFile(archived)).toEqual(bytes);
    await expect(captureTodo({ ...params, body: "changed" })).rejects.toThrow("different content");
  });

  it("does not overwrite a different capture or publish partial temporary files", async () => {
    const results = await Promise.all(Array.from({ length: 4 }, (_, i) => captureNote({ type: "note", title: "知".repeat(200), body: String(i), captureId: `id-${i}` })));
    expect(new Set(results.map((r) => r.filePath)).size).toBe(4);
    for (const item of results) expect(Buffer.byteLength(basename(item.filePath))).toBeLessThanOrEqual(240);
    expect((await readdir(join(vault, "_raw"))).some((name) => name.startsWith("."))).toBe(false);
  });

  it("rejects invalid IDs, impossible dates and blank content before publishing", async () => {
    const base = { title: "task", body: "task", captureId: "valid" };
    await expect(captureTodo({ ...base, captureId: "../../outside" })).rejects.toThrow("ID");
    await expect(captureTodo({ ...base, scheduled: "2026-02-30" })).rejects.toThrow("Date");
    await expect(captureTodo({ ...base, body: " \n " })).rejects.toThrow("Body cannot be empty");
    expect(await readdir(vault)).toEqual([]);
  });

  it("refuses a raw symlink that would write outside the selected Vault", async () => {
    const external = join(root, "external");
    await mkdir(external);
    await symlink(external, join(vault, "_raw"));
    await expect(captureTodo({ title: "task", body: "task", captureId: "safe" })).rejects.toThrow("symlink");
    expect(await readdir(external)).toEqual([]);
  });
});
