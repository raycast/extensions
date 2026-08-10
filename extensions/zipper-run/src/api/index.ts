import fetch, { Response } from "node-fetch";
import { BootInfoResult, AppletConfigs } from "./types";

export async function fetchBootInfo(appletName: string, filename: string = ""): Promise<BootInfoResult | undefined> {
  const response = await fetch(`https://zipper.dev/api/bootInfo/${appletName}`, {
    method: "POST",
    body: JSON.stringify({ filename }),
  });

  const bootInfo = (await response.json()) as BootInfoResult;

  return bootInfo;
}

export async function fetchConfig({
  appletName,
  filename,
}: {
  appletName: string;
  filename: string;
}): Promise<AppletConfigs | undefined> {
  try {
    const response = await fetch(`https://${appletName}.zipper.run/boot`, {
      method: "POST",
      body: JSON.stringify({ filename }),
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return (await response.json()) as AppletConfigs;
  } catch (error) {
    console.error("Failed to fetch config:", error);
  }
}

export async function runApplet({
  appletName,
  scriptName,
  appletUrlArguments,
}: {
  appletName: string;
  scriptName?: string;
  appletUrlArguments: string;
}): Promise<Response> {
  const url = `https://${appletName}.zipper.run/${scriptName || "main.ts"}/api?${appletUrlArguments}`;
  return fetch(url, {
    method: "GET",
  });
}
