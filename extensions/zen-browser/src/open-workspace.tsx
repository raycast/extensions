import { List } from "@raycast/api";
import { ReactElement } from "react";
import { ZenListEntries } from "./components";
import { useWorkspaces } from "./hooks/useWorkspaces";

export default function Command(): ReactElement {
  const { data, isLoading, errorView } = useWorkspaces();

  if (errorView) {
    return errorView;
  }

  return (
    <List isLoading={isLoading}>
      {data?.map((ws) => (
        <ZenListEntries.WorkspaceEntry workspace={ws} key={ws.uuid} />
      ))}
    </List>
  );
}
