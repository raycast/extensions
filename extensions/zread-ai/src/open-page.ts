import { type LaunchProps, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getRepoIdentifierFromArgumentOrCurrentTab } from "./get-repo-identifier";
import { normalizeToZreadUrl } from "./repository";

type OpenPageArguments = {
  repoIdentifier?: string;
};

export default async function Command(props: LaunchProps<{ arguments: OpenPageArguments }>) {
  try {
    const repoIdentifier = await getRepoIdentifierFromArgumentOrCurrentTab(props.arguments.repoIdentifier);

    await open(normalizeToZreadUrl(repoIdentifier));
  } catch (error) {
    await showFailureToast(error, { title: "Could Not Open zread.ai Page" });
  }
}
