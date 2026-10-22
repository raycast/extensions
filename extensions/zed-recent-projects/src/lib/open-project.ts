import { popToRoot, PopToRootType, type closeMainWindow } from "@raycast/api";

export async function openProject(open: () => Promise<void>, close: typeof closeMainWindow): Promise<void> {
  // Keep the command alive while the CLI starts, even when Raycast normally pops to root on close.
  await Promise.all([open(), close({ popToRootType: PopToRootType.Suspended })]);
  await popToRoot();
}
