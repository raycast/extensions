import { getPreferenceValues, open, BrowserExtension, Application } from "@raycast/api";

const openMeetTabUrl = "https://meet.google.com/new";

type Preferences = {
  preferredBrowser?: Application;
};

function getPreferredBrowser() {
  return getPreferenceValues<Preferences>().preferredBrowser;
}

export async function getMeetTab(): Promise<string> {
  const openTabs = await BrowserExtension.getTabs();
  const meetTab = openTabs.find((tab) => tab.url.includes("meet.google.com"));

  if (meetTab?.url.includes("/new")) {
    await new Promise((r) => setTimeout(r, 500));
    return getMeetTab();
  }

  if (!meetTab?.url) {
    throw new Error("Could not find Google Meet tab.");
  }

  return meetTab.url;
}

export async function openMeetTabDefaultProfile(): Promise<void> {
  const preferredBrowser = getPreferredBrowser();
  await open(openMeetTabUrl, preferredBrowser?.path);
}

export async function openMeetTabSelectedProfile(profile: string): Promise<void> {
  const preferredBrowser = getPreferredBrowser();
  await open(`${openMeetTabUrl}?authuser=${profile}`, preferredBrowser?.path);
}
