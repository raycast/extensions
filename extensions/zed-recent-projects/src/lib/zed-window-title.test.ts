import { describe, expect, it } from "vitest";
import {
  findUniqueMatchingWindowTitle,
  windowTitleContainsProjectPath,
  windowTitleMatchesProject,
} from "./zed-window-title";

describe("windowTitleMatchesProject", () => {
  it("matches an exact window title", () => {
    expect(windowTitleMatchesProject("foo", "foo")).toBe(true);
  });

  it("matches Zed's default filename — project title", () => {
    expect(windowTitleMatchesProject("channel.rs — foo", "foo")).toBe(true);
  });

  it("matches a project-first composite title", () => {
    expect(windowTitleMatchesProject("foo — channel.rs", "foo")).toBe(true);
  });

  it("does not treat one title as a substring of another", () => {
    expect(windowTitleMatchesProject("website", "web")).toBe(false);
    expect(windowTitleMatchesProject("index.ts — website", "web")).toBe(false);
    expect(windowTitleMatchesProject("foo-bar", "foo")).toBe(false);
    expect(windowTitleMatchesProject("main.ts — foo-bar", "foo")).toBe(false);
  });

  it("strips collab indicators from the project segment", () => {
    expect(windowTitleMatchesProject("channel.rs — foo ↗", "foo")).toBe(true);
    expect(windowTitleMatchesProject("channel.rs — foo ↙", "foo")).toBe(true);
  });

  it("does not match an empty title", () => {
    expect(windowTitleMatchesProject("foo", "")).toBe(false);
    expect(windowTitleMatchesProject("", "foo")).toBe(false);
  });

  it("keeps a project name that contains a title separator", () => {
    expect(windowTitleMatchesProject("main.ts — my - project", "my - project")).toBe(true);
    expect(windowTitleMatchesProject("my - project — main.ts", "my - project")).toBe(true);
    expect(windowTitleMatchesProject("main.ts - my - project", "my - project")).toBe(true);
    expect(windowTitleMatchesProject("my - project - main.ts", "my - project")).toBe(true);
  });

  it("does not treat the suffix of a hyphenated project name as that project", () => {
    expect(windowTitleMatchesProject("main.ts — my - project", "project")).toBe(false);
    expect(windowTitleMatchesProject("main.ts - my - project", "project")).toBe(false);
    expect(windowTitleMatchesProject("my - project", "project")).toBe(false);
    expect(windowTitleMatchesProject("README - my - project", "project")).toBe(false);
  });

  it("matches a hyphenated project name when an extensionless file is active", () => {
    expect(windowTitleMatchesProject("README - my - project", "my - project")).toBe(true);
    expect(windowTitleMatchesProject("Makefile - my - project", "my - project")).toBe(true);
    expect(windowTitleMatchesProject("LICENSE - my - project", "my - project")).toBe(true);
    expect(windowTitleMatchesProject("my - project - README", "my - project")).toBe(true);
  });

  it("matches extensionless files with a simple project name", () => {
    expect(windowTitleMatchesProject("README - foo", "foo")).toBe(true);
    expect(windowTitleMatchesProject("Makefile - foo", "foo")).toBe(true);
    expect(windowTitleMatchesProject("foo - Dockerfile", "foo")).toBe(true);
  });
});

describe("windowTitleContainsProjectPath", () => {
  it("matches a window title that includes the full project path", () => {
    expect(windowTitleContainsProjectPath("/Users/a/foo/src/main.ts", "/Users/a/foo")).toBe(true);
  });

  it("does not treat /foo as a prefix of /foo-bar", () => {
    expect(windowTitleContainsProjectPath("/Users/a/foo-bar/src/main.ts", "/Users/a/foo")).toBe(false);
  });
});

describe("findUniqueMatchingWindowTitle", () => {
  it("returns the only window whose project segment matches", () => {
    expect(findUniqueMatchingWindowTitle(["a.ts — foo", "b.ts — bar"], "foo")).toBe("a.ts — foo");
  });

  it("returns null when two windows share the same project name", () => {
    expect(findUniqueMatchingWindowTitle(["a.ts — foo", "b.ts — foo"], "foo")).toBe(null);
  });

  it("returns null when the title is only a substring of another project", () => {
    expect(findUniqueMatchingWindowTitle(["index.ts — website"], "web")).toBe(null);
  });

  it("picks the exact project when an overlapping title is also open", () => {
    const windows = ["index.ts — web", "index.ts — website"];
    expect(findUniqueMatchingWindowTitle(windows, "web")).toBe("index.ts — web");
    expect(findUniqueMatchingWindowTitle(windows, "website")).toBe("index.ts — website");
  });

  it("matches a unique window whose project name contains a separator", () => {
    expect(findUniqueMatchingWindowTitle(["main.ts — my - project", "main.ts — other"], "my - project")).toBe(
      "main.ts — my - project",
    );
    expect(findUniqueMatchingWindowTitle(["README - my - project", "README - other"], "my - project")).toBe(
      "README - my - project",
    );
  });

  it("prefers a unique path match over a shared basename", () => {
    expect(
      findUniqueMatchingWindowTitle(
        ["/Users/a/foo/src/main.ts — foo", "/Users/b/foo/src/main.ts — foo"],
        "foo",
        "/Users/a/foo",
      ),
    ).toBe("/Users/a/foo/src/main.ts — foo");
  });

  it("returns null when two windows contain the same project path", () => {
    expect(
      findUniqueMatchingWindowTitle(["/Users/a/foo/src/a.ts", "/Users/a/foo/src/b.ts"], "foo", "/Users/a/foo"),
    ).toBe(null);
  });

  it("does not accept /foo as matching a /foo-bar path title", () => {
    expect(findUniqueMatchingWindowTitle(["/Users/a/foo-bar/src/main.ts"], "foo", "/Users/a/foo")).toBe(null);
  });
});
