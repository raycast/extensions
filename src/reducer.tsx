import { Application } from "@raycast/api";

export interface State {
  frontmostApplication?: string | undefined;
  repositoryPath?: string | undefined;
  commitMessage?: string | undefined;
}

export const initialState: State = {};

type actions =
  | ["set_frontmost_application", Application]
  | ["set_repository_path", string | undefined]
  | ["set_commit_message", string | undefined];

export function reducer(state: State, [type, payload]: actions): typeof initialState {
  switch (type) {
    case "set_frontmost_application":
      return { ...state, frontmostApplication: payload?.name || "Active app" };
    case "set_repository_path":
      return { ...state, repositoryPath: payload };
    case "set_commit_message":
      return { ...state, commitMessage: payload };
    default:
      throw new Error("Unknown action: " + type);
  }
}
