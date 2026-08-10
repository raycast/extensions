import { BrowserExtension, environment, getFrontmostApplication, LocalStorage } from "@raycast/api";
import React, { useEffect, useState } from "react";
import Values = LocalStorage.Values;

// BrowserExtension currently supports Safari and Chromium browsers
const supportedBrowser = ["Safari", "Google Chrome", "Arc", "Brave Browser", "Opera"];
const usageKey = "usageData-";

interface AccountUsage {
  appUsage: Map<string, number>;
  tabUsage: Map<string, number>;
}

type UsageData = Map<string, AccountUsage>;

export interface AppDetails {
  name: string;
  tabHostnames: string[];
}

export function getUsageData(usages: number) {
  const [usageData, setUsageData] = useState<UsageData>();

  async function fetchUsageData() {
    const allItems = await LocalStorage.allItems<Values>();

    const usageData = new Map<string, AccountUsage>();
    for (const [key, value] of Object.entries(allItems)) {
      if (key.startsWith(usageKey)) {
        const parsed = JSON.parse(value);
        // Convert the parsed objects back to Maps
        usageData.set(key, {
          appUsage: new Map(Object.entries(parsed.appUsage)),
          tabUsage: new Map(Object.entries(parsed.tabUsage)),
        });
      }
    }

    setUsageData(usageData);
  }

  useEffect(() => {
    fetchUsageData();
  }, [usages]);

  return usageData;
}

export function getActiveApp() {
  const [appDetails, setAppDetails] = useState<AppDetails>();

  async function fetchActiveApp() {
    try {
      const activeApp = await getFrontmostApplication();
      const activeAppDetails: AppDetails = {
        name: "",
        tabHostnames: [],
      };

      activeAppDetails.name = activeApp.name;

      if (environment.canAccess(BrowserExtension) && supportedBrowser.includes(activeApp.name)) {
        const tabs = await BrowserExtension.getTabs();
        activeAppDetails.tabHostnames = tabs.filter((t) => t.active).map((t) => new URL(t.url).hostname);
      }

      setAppDetails(activeAppDetails);
    } catch (error) {
      console.error("Failed loading active app: ", error);
    }
  }

  useEffect(() => {
    fetchActiveApp();
  }, []);

  return appDetails;
}

export async function updateUsage(accountKey: string, activeApp: AppDetails | undefined) {
  if (!activeApp) {
    return;
  }

  const accountUsageString = await LocalStorage.getItem<string>(usageKey + accountKey);

  let accountUsage: AccountUsage;
  if (accountUsageString) {
    const parsed = JSON.parse(accountUsageString);
    // Convert the parsed objects back to Maps
    accountUsage = {
      appUsage: new Map(Object.entries(parsed.appUsage)),
      tabUsage: new Map(Object.entries(parsed.tabUsage)),
    };
  } else {
    accountUsage = {
      appUsage: new Map<string, number>(),
      tabUsage: new Map<string, number>(),
    };
  }

  accountUsage.appUsage.set(activeApp.name, (accountUsage.appUsage.get(activeApp.name) ?? 0) + 1);

  activeApp.tabHostnames.forEach((tabName) => {
    accountUsage.tabUsage.set(tabName, (accountUsage.tabUsage.get(tabName) ?? 0) + 1);
  });

  // When storing, convert Maps to objects
  await LocalStorage.setItem(
    usageKey + accountKey,
    JSON.stringify({
      appUsage: Object.fromEntries(accountUsage.appUsage),
      tabUsage: Object.fromEntries(accountUsage.tabUsage),
    })
  );
}

export function makeUsageSorter(
  usageData: Map<string, AccountUsage> | undefined,
  activeApp: AppDetails | undefined
): (a: React.JSX.Element, b: React.JSX.Element) => number {
  return (a: React.JSX.Element, b: React.JSX.Element): number => {
    const keyA = a.key || "";
    const keyB = b.key || "";

    // keyB and keyA are flipped here to maintain standard string sorting
    const sortStack = [compareValues(keyB, keyA)];

    // use the most relevant non-zero sort
    const walkSortStack = (results: number[]) => {
      return results.reverse().reduce((prev, curr) => prev || curr, 0);
    };

    if (usageData && activeApp) {
      const usageDataA = usageData.get(usageKey + keyA);
      const usageDataB = usageData.get(usageKey + keyB);

      // use default sorting if neither accounts have usage data
      if (!usageDataA && !usageDataB) {
        return walkSortStack(sortStack);
      }

      // when only one account has usage data, sort it first
      if (!usageDataA || !usageDataB) {
        return usageDataA ? -1 : 1;
      }

      // when both accounts have usage data, add total usage sort to the stack
      const totalUsageA = [...usageDataA.appUsage.values()].reduce((prev, curr) => prev + curr, 0);
      const totalUsageB = [...usageDataB.appUsage.values()].reduce((prev, curr) => prev + curr, 0);
      sortStack.push(compareValues(totalUsageA, totalUsageB));

      // attempt to sort by usage of the active app
      const appName = activeApp.name;
      const appUsageA = usageDataA.appUsage.get(appName);
      const appUsageB = usageDataB.appUsage.get(appName);

      // exit if neither accounts have app usage data
      if (!appUsageA && !appUsageB) {
        return walkSortStack(sortStack);
      }

      // when only one account has usage with the current app, sort it first
      if (!appUsageA || !appUsageB) {
        return appUsageA ? -1 : 1;
      }

      sortStack.push(compareValues(appUsageA, appUsageB));

      // exit if there is no tab data to sort by
      if (!activeApp.tabHostnames.length) {
        return walkSortStack(sortStack);
      }

      const getMostUsedTab = (tabUsage: Map<string, number>) =>
        activeApp.tabHostnames
          .map((tabName) => tabUsage.get(tabName) || 0)
          .reduce((max, current) => Math.max(max, current), 0);

      const tabUsageA = getMostUsedTab(usageDataA.tabUsage);
      const tabUsageB = getMostUsedTab(usageDataB.tabUsage);

      sortStack.push(compareValues(tabUsageA, tabUsageB));
    }

    return walkSortStack(sortStack);
  };
}

const compareValues = (a: string | number, b: string | number) => (a > b ? -1 : b > a ? 1 : 0);
