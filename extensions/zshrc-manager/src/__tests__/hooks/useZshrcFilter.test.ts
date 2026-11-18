/**
 * Tests for useZshrcFilter custom hook
 */

import { renderHook, act } from "@testing-library/react";
import { useZshrcFilter } from "../../hooks/useZshrcFilter";

interface TestItem {
  name: string;
  command: string;
  section: string;
  [key: string]: unknown;
}

const mockItems: TestItem[] = [
  { name: "ll", command: "ls -la", section: "General" },
  { name: "gs", command: "git status", section: "Git" },
  { name: "gc", command: "git commit", section: "Git" },
  { name: "py", command: "python3", section: "Python" },
  { name: "ni", command: "npm install", section: "Node" },
];

describe("useZshrcFilter", () => {
  it("should initialize with empty search text", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name", "command"]));

    expect(result.current.searchText).toBe("");
  });

  it("should return all items with empty search", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name", "command"]));

    expect(result.current.filtered).toEqual(mockItems);
  });

  it("should filter items by name", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name", "command"]));

    act(() => {
      result.current.setSearchText("gs");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]?.["name"]).toBe("gs");
  });

  it("should filter items by command", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name", "command"]));

    act(() => {
      result.current.setSearchText("git");
    });

    expect(result.current.filtered).toHaveLength(2);
    expect(result.current.filtered.map((i) => i["name"])).toEqual(["gs", "gc"]);
  });

  it("should be case insensitive", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name", "command"]));

    act(() => {
      result.current.setSearchText("GIT");
    });

    expect(result.current.filtered).toHaveLength(2);
  });

  it("should filter by section", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["section"]));

    act(() => {
      result.current.setSearchText("Git");
    });

    expect(result.current.filtered).toHaveLength(2);
  });

  it("should handle partial matches", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["command"]));

    act(() => {
      result.current.setSearchText("python");
    });

    expect(result.current.filtered).toHaveLength(1);
  });

  it("should group filtered items by section", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name", "command"]));

    act(() => {
      result.current.setSearchText("git");
    });

    expect(Object.keys(result.current.grouped)).toEqual(["Git"]);
    expect(result.current.grouped["Git"]).toHaveLength(2);
  });

  it("should group all sections when no filter applied", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name", "command"]));

    const sections = Object.keys(result.current.grouped);
    expect(sections).toContain("General");
    expect(sections).toContain("Git");
    expect(sections).toContain("Python");
    expect(sections).toContain("Node");
  });

  it("should update filtered results when search text changes", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name"]));

    act(() => {
      result.current.setSearchText("g");
    });

    expect(result.current.filtered).toHaveLength(2); // gs, gc

    act(() => {
      result.current.setSearchText("gs");
    });

    expect(result.current.filtered).toHaveLength(1);
  });

  it("should handle items with no matches", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name"]));

    act(() => {
      result.current.setSearchText("xyz");
    });

    expect(result.current.filtered).toHaveLength(0);
    expect(Object.keys(result.current.grouped)).toHaveLength(0);
  });

  it("should handle empty search string", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name"]));

    act(() => {
      result.current.setSearchText("ll");
    });

    expect(result.current.filtered).toHaveLength(1);

    act(() => {
      result.current.setSearchText("");
    });

    expect(result.current.filtered).toEqual(mockItems);
  });

  it("should handle whitespace-only search", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name"]));

    act(() => {
      result.current.setSearchText("   ");
    });

    expect(result.current.filtered).toEqual(mockItems);
  });

  it("should preserve item order in grouped results", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["section"]));

    act(() => {
      result.current.setSearchText("git");
    });

    expect(result.current.grouped["Git"]).toEqual([
      { name: "gs", command: "git status", section: "Git" },
      { name: "gc", command: "git commit", section: "Git" },
    ]);
  });

  it("should handle multiple search fields", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name", "command", "section"]));

    act(() => {
      result.current.setSearchText("python");
    });

    expect(result.current.filtered).toHaveLength(1);

    act(() => {
      result.current.setSearchText("Python");
    });

    expect(result.current.filtered).toHaveLength(1);
  });

  it("should handle items with empty string fields", () => {
    const itemsWithEmpty = [...mockItems, { name: "", command: "test-command", section: "Test" }];
    const { result } = renderHook(() => useZshrcFilter(itemsWithEmpty, ["name", "command"]));

    act(() => {
      result.current.setSearchText("test");
    });

    expect(result.current.filtered.map((i) => i["section"])).toContain("Test");
  });

  it("should update search text state", () => {
    const { result } = renderHook(() => useZshrcFilter(mockItems, ["name"]));

    expect(result.current.searchText).toBe("");

    act(() => {
      result.current.setSearchText("ll");
    });

    expect(result.current.searchText).toBe("ll");
  });

  it("should handle special characters in search", () => {
    const itemsWithSpecial = [
      { name: "test-alias", command: "test", section: "Test" },
      { name: "test.alias", command: "test", section: "Test" },
    ];
    const { result } = renderHook(() => useZshrcFilter(itemsWithSpecial, ["name"]));

    act(() => {
      result.current.setSearchText("test-");
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]?.name).toBe("test-alias");
  });
});
