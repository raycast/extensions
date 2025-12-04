import { describe, it, expect } from "vitest";
import { parseZedWorkspace } from "./workspaces";

describe("parseZedWorkspace", () => {
  it("parse local workspace with single path", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "local",
        timestamp: 1757750879526,
        paths: `/Users/raycast/Projects/zed-project-1`,
      }),
    ).toMatchSnapshot();
  });

  it("skips local workspace with multiple paths", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "local",
        timestamp: 1757750879526,
        paths: `/Users/raycast/Projects/zed-project-1
/Users/raycast/Projects/zed-project-2`,
      }),
    ).toMatchSnapshot();
  });

  it("parse remote workspace with single path, no user, no port", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "remote",
        timestamp: 1757750879526,
        host: "example.com",
        user: null,
        port: null,
        paths: "/home/user/project",
      }),
    ).toMatchSnapshot();
  });

  it("parse remote workspace with single path, with user, no port", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "remote",
        timestamp: 1757750879526,
        host: "example.com",
        user: "testuser",
        port: null,
        paths: "/home/user/project",
      }),
    ).toMatchSnapshot();
  });

  it("parse remote workspace with single path, no user, with port", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "remote",
        timestamp: 1757750879526,
        host: "example.com",
        user: null,
        port: 22,
        paths: "/home/user/project",
      }),
    ).toMatchSnapshot();
  });

  it("parse remote workspace with single path, with user and port", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "remote",
        timestamp: 1757750879526,
        host: "example.com",
        user: "testuser",
        port: 22,
        paths: "/home/user/project",
      }),
    ).toMatchSnapshot();
  });

  it("skips remote workspace with multiple paths", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "remote",
        timestamp: 1757750879526,
        host: "example.com",
        user: "testuser",
        port: 22,
        paths: "/home/user/project1\n/home/user/project2",
      }),
    ).toMatchSnapshot();
  });

  it("returns null for empty paths", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "local",
        timestamp: 1757750879526,
        paths: "",
      }),
    ).toBe(null);
  });
});
