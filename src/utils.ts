import { useAI, showFailureToast } from "@raycast/utils";
import { execSync } from "child_process";

export function getRepositoryPath(pathToRepos: string) {
  return execSync(`ls -ltd -d ${pathToRepos}/*/.git/ | head -n 1 | rev | cut -d' ' -f1 | rev | xargs dirname`)
    .toString()
    .trim();
}

function buildInputForAi(repositoryPath: string, prompt: string) {
  const diffOutput = execSync(`git -C ${repositoryPath} diff HEAD`).toString().slice(0, 9000);
  const statusOutput = execSync(`git -C ${repositoryPath} status -uno`);

  return `${prompt}\n\nMy git status is: \n\n${statusOutput}\n\nMy git diff is: \n\n${diffOutput}\n\n`;
}

export function generateCommitMessage(repositoryPath: string, prompt: string) {
  try {
    const input = buildInputForAi(repositoryPath, prompt);
    return useAI(input, { creativity: 0 });
  } catch (error) {
    showFailureToast(error, { title: "Failed to generate commit message" });
    return { data: undefined, isLoading: false, error: error, revalidate: () => {} };
  }
}
