import path from "path";
import fs from "fs";
import archiver from "archiver";
import fetch from "node-fetch";
import crypto from "crypto";
import ignore from "ignore";
import { readdir } from "fs/promises";
import { showToast, Toast } from "@raycast/api";
import { ErrorResponse, CreateUploadSessionResponse, PrepareUploadResponse } from "../type";

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
    const url = await deploy(blob);

    await showToast({
      style: Toast.Style.Success,
      title: "Project deployed successfully",
    });

    return url;
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

async function compressDirectory(sourceDir: string, outPath: string): Promise<void> {
  const output = fs.createWriteStream(outPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on("close", () => resolve());
    archive.on("error", (err: Error) => reject(err));
    archive.pipe(output);

    const gitignorePath = path.join(sourceDir, ".gitignore");
    const ig = ignore().add(["node_modules/", ".git/", ".zeabur/", "venv/", "env/", ".*/"]);

    if (fs.existsSync(gitignorePath)) {
      const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
      ig.add(gitignoreContent);
    }

    async function addFiles(dir: string, base = "") {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.join(base, entry.name);
        const normalizedPath = relativePath.replace(/\\/g, "/");

        if (ig.ignores(normalizedPath)) continue;

        if (entry.isDirectory()) {
          await addFiles(fullPath, normalizedPath);
        } else {
          archive.file(fullPath, { name: normalizedPath });
        }
      }
    }

    addFiles(sourceDir)
      .then(() => {
        archive.finalize();
      })
      .catch(reject);
  });
}

async function calculateSHA256(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(arrayBuffer));
  return hash.digest("base64");
}

async function deploy(code: Blob) {
  if (!code) {
    throw new Error("Code is required");
  }

  // Calculate content hash
  const contentHash = await calculateSHA256(code);
  const contentLength = code.size;

  // Create upload session
  const createSessionRes = await fetch("https://api.zeabur.com/v2/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content_hash: contentHash,
      content_hash_algorithm: "sha256",
      content_length: contentLength,
    }),
  });

  if (!createSessionRes.ok) {
    const errorData = (await createSessionRes.json()) as ErrorResponse;
    throw new Error(errorData.error || `Failed to create upload session: ${createSessionRes.statusText}`);
  }

  const { presign_url, presign_header, upload_id } = (await createSessionRes.json()) as CreateUploadSessionResponse;

  // Upload file using presigned URL
  const uploadRes = await fetch(presign_url, {
    method: "PUT",
    headers: {
      ...presign_header,
      "Content-Length": contentLength.toString(),
    },
    body: code,
  });

  if (!uploadRes.ok) {
    const errorData = (await uploadRes.json().catch(() => ({ error: uploadRes.statusText }))) as ErrorResponse;
    throw new Error(errorData.error || `Failed to upload file: ${uploadRes.statusText}`);
  }

  // Prepare upload for deployment
  const prepareRes = await fetch(`https://api.zeabur.com/v2/upload/${upload_id}/prepare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      upload_type: "new_project",
    }),
  });

  if (!prepareRes.ok) {
    const errorData = (await prepareRes.json()) as ErrorResponse;
    throw new Error(errorData.error || `Failed to prepare upload: ${prepareRes.statusText}`);
  }

  const { url } = (await prepareRes.json()) as PrepareUploadResponse;
  return url;
}
