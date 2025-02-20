import path from "path";
import fs from "fs";
import archiver from "archiver";
import fetch from "node-fetch";
import { FormData } from "node-fetch";
import { showToast, Toast } from "@raycast/api";

export async function deployProject(deployProjectPath: string): Promise<string> {
  const outputPath = path.join(deployProjectPath, ".zeabur/project.zip");
  const outputDir = path.dirname(outputPath);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  await showToast({
    style: Toast.Style.Animated,
    title: "Deploying project",
  });

  try {
    await compressDirectory(deployProjectPath, outputPath);
    const zipContent = await fs.promises.readFile(outputPath);
    const blob = new Blob([zipContent], { type: "application/zip" });
    const uploadID = await deploy(blob);

    await showToast({
      style: Toast.Style.Success,
      title: "Project deployed successfully",
    });

    return `https://zeabur.com/uploads/${uploadID}`;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to deploy project",
      message: error instanceof Error ? error.message : String(error),
    });
    return "";
  } finally {
    // Clean up the temporary zip file
    fs.unlinkSync(outputPath);
  }
}

function compressDirectory(sourceDir: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err: Error) => reject(err));

    archive.pipe(output);

    const gitignorePath = path.join(sourceDir, ".gitignore");
    let ignorePatterns: string[] = ["**/node_modules/**", "**/.git/**", "**/.zeabur/**", "**/venv/**"];

    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      ignorePatterns = ignorePatterns.concat(
        gitignoreContent.split("\n").filter((line) => line.trim() && !line.startsWith("#") && !line.includes("!")),
      );
    }

    archive.glob("**/*", {
      cwd: sourceDir,
      ignore: ignorePatterns,
      dot: true,
    });

    archive.finalize();
  });
}

async function deploy(code: Blob) {
  if (!code) {
    throw new Error("Code is required");
  }

  const formData = new FormData();
  formData.append("code", code, "code.zip");

  const res = await fetch(`https://api.zeabur.com/upload`, { method: "POST", body: formData });
  const deployResponse = (await res.json()) as { id: string };

  return deployResponse.id;
}
