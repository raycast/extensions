/**
 * The health report's pending state is derived from data identity, not
 * effect timing: a check is owed whenever the stored broken-source result
 * was not computed for the current stats snapshot. There is no render —
 * first paint or post-refresh — where stale data reads as settled.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useHealthReport } from "../hooks/useHealthReport";
import { detectBrokenSources } from "../utils/validation";
import { createMockSection } from "./fixtures/sections";

vi.mock("../utils/validation", async (importOriginal) => {
  const original = await importOriginal<typeof import("../utils/validation")>();
  return {
    ...original,
    detectBrokenSources: vi.fn(),
  };
});

const withSources = (label: string) => [
  createMockSection({
    label,
    content: 'alias gs="git status"\nalias gs="git switch"\nsource /opt/somewhere/init.zsh',
    startLine: 1,
    endLine: 4,
  }),
];

describe("useHealthReport pending state", () => {
  // Hoisted: consumers pass stable section arrays (loader state), so the
  // hook's identity-based pending derivation sees one snapshot per config
  const gitSections = withSources("Git");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(detectBrokenSources).mockResolvedValue({ brokenSources: [], totalBroken: 0 });
  });

  it("is checking on the very first render, before any effect has run", () => {
    const { result } = renderHook(() => useHealthReport(gitSections));
    expect(result.current.isChecking).toBe(true);
  });

  it("reports synchronous duplicate issues immediately, even while the source check is pending", () => {
    vi.mocked(detectBrokenSources).mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useHealthReport(gitSections));
    expect(result.current.isChecking).toBe(true);
    expect(result.current.issues.some((issue) => issue.category === "duplicates")).toBe(true);
  });

  it("settles once the check for the current snapshot completes", async () => {
    const { result } = renderHook(() => useHealthReport(gitSections));
    await waitFor(() => expect(result.current.isChecking).toBe(false));
  });

  it("re-enters checking synchronously when the sections change", async () => {
    const first = withSources("Git");
    const { result, rerender } = renderHook(({ sections }) => useHealthReport(sections), {
      initialProps: { sections: first },
    });
    await waitFor(() => expect(result.current.isChecking).toBe(false));

    rerender({ sections: withSources("Changed") });
    expect(result.current.isChecking).toBe(true);
    await waitFor(() => expect(result.current.isChecking).toBe(false));
  });

  it("is settled for an empty configuration — there is nothing to check", () => {
    const { result } = renderHook(() => useHealthReport([]));
    expect(result.current.isChecking).toBe(false);
    expect(result.current.issues).toEqual([]);
  });
});
