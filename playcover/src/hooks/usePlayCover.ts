import fs from "node:fs";
import os from "node:os";
import { PlayCoverApp } from "../PlayCover/interfaces";
const folder = `${os.homedir()}/Library/Containers/io.playcover.PlayCover`;

export const usePlayCover = () => {
  const APPS_INSIDE_FOLDER = fs.readdirSync(folder).filter((app) => app.endsWith(".app"));
  const arr: PlayCoverApp[] = APPS_INSIDE_FOLDER.map((app) => {
    const appPath = `${folder}/${app}`;
    const appIconName = fs
      .readdirSync(appPath)
      .filter((file) => file.includes("AppIcon"))
      .at(-1);
    const obj = {
      title: app === "GenshinImpact.app" ? "Genshin Impact" : app.replace(".app", ""),
      bundleId: app,
      icon: `${appPath}/${appIconName}`,
    };
    return obj;
  });
  return arr;
};

export const usePlayCoverSearch = (firstRun: boolean, searchText: string) => {
  if (firstRun) {
    const APPS_INSIDE_FOLDER = fs.readdirSync(folder).filter((app) => app.endsWith(".app"));
    const filteredApps = APPS_INSIDE_FOLDER.filter((app) => app.toLowerCase().includes(searchText.toLowerCase()));
    const arr: PlayCoverApp[] = filteredApps.map((app) => {
      const appPath = `${folder}/${app}`;
      const appIconName = fs
        .readdirSync(appPath)
        .filter((file) => file.includes("AppIcon"))
        .at(-1);
      const obj = {
        title: app === "GenshinImpact.app" ? "Genshin Impact" : app.replace(".app", ""),
        bundleId: app,
        icon: `${appPath}/${appIconName}`,
      };
      return obj;
    });
    return arr;
  }
  return usePlayCover();
};
