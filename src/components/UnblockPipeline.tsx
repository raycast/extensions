import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import fetch from "cross-fetch";

export async function unblockPipeline(pipelineSlug: string, buildNumber: number) {
  const preferences = getPreferenceValues<{ org: string; token: string }>();

  try {
    const buildResponse = await fetch(
      `https://api.buildkite.com/v2/organizations/${preferences.org}/pipelines/${pipelineSlug}/builds/${buildNumber}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${preferences.token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!buildResponse.ok) {
      console.log("Status Code:", buildResponse.status);
      console.log("Status Text:", buildResponse.statusText);
      console.log("Response Body:", await buildResponse.text());
      throw new Error("Failed to fetch build details");
    }

    const build = await buildResponse.json();

    const blockedJob = build.jobs.find((job: any) => job.type === "manual" && job.state.toLowerCase() === "blocked");

    if (!blockedJob || !blockedJob.unblock_url) {
      throw new Error("No blocked manual job found for this build");
}

    if (!blockedJob || !blockedJob.unblock_url) {
      throw new Error("No blocked manual job found for this build");
    }

    // Step 3: Unblock the Job
    const unblockResponse = await fetch(blockedJob.unblock_url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${preferences.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}), 
    });

    if (!unblockResponse.ok) {
      throw new Error("Failed to unblock the job");
    }

    showToast({
      style: Toast.Style.Success,
      title: "Job Unblocked Successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    if (error instanceof Error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error.message,
      });
    } else {
      showToast({
        style: Toast.Style.Failure,
        title: "Unknown Error",
      });
    }
  }
}
