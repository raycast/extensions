import path from "path";
import fs from "fs";
import archiver from "archiver";
import fetch from "node-fetch";
import { FormData } from "node-fetch";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import {
  CreateTemporaryProjectResponse,
  CreateServiceResponse,
  GetEnvironmentResponse,
  CreateDomainResponse,
  GetDomainResponse,
  ProjectAndService,
  DeployResult,
} from "../type";

const API_URL = "https://gateway.zeabur.com/graphql";

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
    const projectName = path.basename(deployProjectPath);
    const result = await deployToZeabur(zipContent, projectName, deployProjectPath);

    await showToast({
      style: Toast.Style.Success,
      title: "Project deployed successfully",
    });

    return `https://dash.zeabur.com/projects/${result.projectID}`;
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

async function graphqlRequest<T extends object>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const preferences = getPreferenceValues();
  const token = preferences.zeaburApiKey;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ query, variables }),
    });
    const data = (await res.json()) as T;

    if (
      "errors" in data &&
      Array.isArray((data as { errors: { message: string }[] }).errors) &&
      (data as { errors: { message: string }[] }).errors[0]?.message === "Permission denied"
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Permission denied",
        message: "This project is claimed, please sign in to your Zeabur account.",
      });
    }

    return data;
  } catch (error) {
    console.error("GraphQL request error:", error);
    throw error;
  }
}

async function getOrCreateProjectAndService(workspacePath: string, serviceName: string): Promise<ProjectAndService> {
  const configPath = path.join(workspacePath, ".zeabur", "config.json");

  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as { projectID: string; serviceID: string };
    if (config.projectID && config.serviceID) {
      return { projectID: config.projectID, serviceID: config.serviceID, justCreated: false };
    }
  }

  const projectID = await createTemporaryProject();
  const serviceID = await createService(projectID, serviceName);

  const zeaburDir = path.join(workspacePath, ".zeabur");
  if (!fs.existsSync(zeaburDir)) {
    fs.mkdirSync(zeaburDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify({ projectID, serviceID }, null, 2));

  return { projectID, serviceID, justCreated: true };
}

async function createTemporaryProject(): Promise<string> {
  const query = `mutation CreateTemporaryProject {
    createTemporaryProject {
      _id
    }
  }`;

  const response = await graphqlRequest<CreateTemporaryProjectResponse>(query, {});
  if (!response.data) {
    throw new Error(response.errors?.[0]?.message ?? "Failed to create temporary project");
  }

  return response.data.createTemporaryProject._id;
}

async function createService(projectID: string, serviceName: string): Promise<string> {
  const query = `mutation CreateService($projectID: ObjectID!, $template: ServiceTemplate!, $name: String!) {
    createService(projectID: $projectID, template: $template, name: $name) {
      _id
    }
  }`;
  const variables = { projectID, template: "GIT", name: serviceName };
  const response = await graphqlRequest<CreateServiceResponse>(query, variables);
  if (!response.data) {
    throw new Error(response.errors?.[0]?.message ?? "Failed to create service");
  }

  return response.data.createService._id;
}

async function getEnvironment(projectID: string): Promise<string> {
  const query = `query GetEnvironment($projectID: ObjectID!) {
    environments(projectID: $projectID) {
      _id
    }
  }`;
  const variables = { projectID };
  const response = await graphqlRequest<GetEnvironmentResponse>(query, variables);
  if (!response.data?.environments?.length) {
    throw new Error("No environments found for the project");
  }

  return response.data.environments[0]._id;
}

async function createDomain(serviceID: string, environmentID: string, serviceName: string): Promise<string> {
  const query = `mutation CreateDomain($serviceID: ObjectID!, $environmentID: ObjectID!, $domain: String!, $isGenerated: Boolean!) {
    addDomain(serviceID: $serviceID, environmentID: $environmentID, domain: $domain, isGenerated: $isGenerated) {
      domain
    }
  }`;
  const variables = {
    serviceID,
    environmentID,
    domain: serviceName,
    isGenerated: true,
  };
  const response = await graphqlRequest<CreateDomainResponse>(query, variables);
  if (!response.data) {
    throw new Error(`${response.errors?.[0]?.message ?? "Failed to create domain"}: ${serviceName}`);
  }

  return response.data.addDomain.domain;
}

async function getDomainOfService(projectID: string, serviceID: string): Promise<string> {
  const getEnvironmentsQuery = `query GetEnvironments($projectID: ObjectID!) {
    environments(projectID: $projectID) {
      _id
    }
  }`;
  const getEnvironmentsVariables = { projectID };
  const getEnvironmentsResponse = await graphqlRequest<GetEnvironmentResponse>(
    getEnvironmentsQuery,
    getEnvironmentsVariables,
  );

  if (!getEnvironmentsResponse.data?.environments?.length) {
    throw new Error("No environments found for the project");
  }

  const environmentID = getEnvironmentsResponse.data.environments[0]._id;

  const getDomainQuery = `query GetDomain($serviceID: ObjectID!, $environmentID: ObjectID!) {
    service(_id: $serviceID) {
      domains(environmentID: $environmentID) {
        domain
      }
    }
  }`;
  const getDomainVariables = { serviceID, environmentID };
  const getDomainResponse = await graphqlRequest<GetDomainResponse>(getDomainQuery, getDomainVariables);

  if (!getDomainResponse.data?.service.domains?.length) {
    throw new Error("No domain found for the service");
  }

  return getDomainResponse.data.service.domains[0].domain;
}

async function deployToZeabur(zipContent: Buffer, projectName: string, workspacePath: string): Promise<DeployResult> {
  const convertedName = convertTitle(projectName);
  const blob = new Blob([zipContent], { type: "application/zip" });
  return await deploy(blob, convertedName, workspacePath);
}

async function deploy(code: Blob, serviceName: string, workspacePath: string): Promise<DeployResult> {
  try {
    if (!code) {
      throw new Error("Code is required");
    }

    const { projectID, serviceID, justCreated } = await getOrCreateProjectAndService(workspacePath, serviceName);

    if (justCreated) {
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    const environmentID = await getEnvironment(projectID);

    const formData = new FormData();
    formData.append("environment", environmentID);
    formData.append("code", code, "code.zip");

    const preferences = getPreferenceValues();
    const token = preferences.zeaburApiKey;
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    await fetch(`https://gateway.zeabur.com/projects/${projectID}/services/${serviceID}/deploy`, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    try {
      const domain = await getDomainOfService(projectID, serviceID);
      return { projectID, domain };
    } catch (error) {
      const domain = await createDomain(serviceID, environmentID, serviceName);
      return { projectID, domain };
    }
  } catch (error) {
    console.error("Failed to deploy project:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to deploy project",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function convertTitle(title: string): string {
  return (
    title
      .replace(/[^a-zA-Z0-9]/g, "-")
      .replace(/^-+/, "")
      .toLowerCase() + generateRandomString()
  );
}

function generateRandomString(): string {
  let result = "";
  const characters = "abcdefghijklmnopqrstuvwxyz";
  const charactersLength = characters.length;
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
