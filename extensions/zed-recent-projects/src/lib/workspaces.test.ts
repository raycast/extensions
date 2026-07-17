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
        paths_order: "0",
        window_id: null,
        session_id: null,
      }),
    ).toMatchSnapshot();
  });

  it("parse local workspace with multiple paths", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "local",
        timestamp: 1757750879526,
        paths: `/Users/raycast/Projects/zed-project-1
/Users/raycast/Projects/zed-project-2`,
        paths_order: "0,1",
        window_id: null,
        session_id: null,
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
        paths_order: "0",
        kind: "ssh",
        distro: null,
        name: null,
        window_id: null,
        session_id: null,
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
        paths_order: "0",
        kind: "ssh",
        distro: null,
        name: null,
        window_id: null,
        session_id: null,
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
        paths_order: "0",
        kind: "ssh",
        distro: null,
        name: null,
        window_id: null,
        session_id: null,
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
        paths_order: "0",
        kind: "ssh",
        distro: null,
        name: null,
        window_id: null,
        session_id: null,
      }),
    ).toMatchSnapshot();
  });

  it("parse remote workspace with multiple paths", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "remote",
        timestamp: 1757750879526,
        host: "example.com",
        user: "testuser",
        port: 22,
        paths: "/home/user/project1\n/home/user/project2",
        paths_order: "0,1",
        kind: "ssh",
        distro: null,
        name: null,
        window_id: null,
        session_id: null,
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
        paths_order: null,
        window_id: null,
        session_id: null,
      }),
    ).toBe(null);
  });

  it("parse WSL workspace with user and distro", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "remote",
        timestamp: 1757750879526,
        host: "localhost",
        user: "wsluser",
        port: null,
        paths: "/home/wsluser/project",
        paths_order: "0",
        kind: "wsl",
        distro: "Ubuntu",
        name: null,
        window_id: null,
        session_id: null,
      }),
    ).toMatchSnapshot();
  });

  it("parse WSL workspace with port", () => {
    expect(
      parseZedWorkspace({
        id: 2,
        type: "remote",
        timestamp: 1757750879527,
        host: "localhost",
        user: "wsluser",
        port: 2222,
        paths: "/home/wsluser/project",
        paths_order: "0",
        kind: "wsl",
        distro: "Debian",
        name: null,
        window_id: null,
        session_id: null,
      }),
    ).toMatchSnapshot();
  });

  it("skips WSL workspace without distro", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "remote",
        timestamp: 1757750879526,
        host: "localhost",
        user: "wsluser",
        port: null,
        paths: "/home/wsluser/project",
        paths_order: "0",
        kind: "wsl",
        distro: null,
        name: null,
        window_id: null,
        session_id: null,
      }),
    ).toMatchSnapshot();
  });

  it("skips WSL workspace without user", () => {
    expect(
      parseZedWorkspace({
        id: 1,
        type: "remote",
        timestamp: 1757750879526,
        host: "localhost",
        user: null,
        port: null,
        paths: "/home/wsluser/project",
        paths_order: "0",
        kind: "wsl",
        distro: "Ubuntu",
        name: null,
        window_id: null,
        session_id: null,
      }),
    ).toMatchSnapshot();
  });
});
