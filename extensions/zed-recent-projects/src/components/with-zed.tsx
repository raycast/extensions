import fs from "fs";
import { ComponentType, createContext, useContext } from "react";
import { Application, Detail, getApplications, LocalStorage } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { zedBuild } from "../lib/preferences";
import { getZedBundleId, getZedDbPath } from "../lib/zed";
import { getZedWorkspaceDbVersion } from "../lib/db";

interface ZedContextType {
  app: Application;
  isDbSupported: boolean;
  workspaceDbVersion: number;
  dbPath: string;
}

const ZedContext = createContext<ZedContextType | undefined>(undefined);

const defaultDbVersionKey = "defaultDbVersion";

function useZed() {
  const dbPath = getZedDbPath();

  const { data, isLoading } = usePromise(async () => {
    const defaultDbVersion = await LocalStorage.getItem<number>(defaultDbVersionKey);
    const [applications, workspaceDbVersion] = await Promise.all([
      getApplications(),
      getZedWorkspaceDbVersion(dbPath, defaultDbVersion),
    ]);
    const zedBundleId = getZedBundleId(zedBuild);
    const app = applications.find((a) => a.bundleId === zedBundleId);

    if (workspaceDbVersion.supported) {
      await LocalStorage.setItem(defaultDbVersionKey, workspaceDbVersion.version);
    }

    return {
      app,
      isDbSupported: workspaceDbVersion.supported,
      workspaceDbVersion: workspaceDbVersion.version,
    };
  });

  return {
    isLoading: isLoading,
    app: data?.app,
    isDbSupported: !!data?.isDbSupported,
    workspaceDbVersion: data?.workspaceDbVersion || 0,
    dbPath,
  };
}

export const withZed = <P extends object>(Component: ComponentType<P>) => {
  return (props: P) => {
    const { app, isDbSupported, workspaceDbVersion, dbPath, isLoading } = useZed();

    if (!app) {
      return <Detail isLoading={isLoading} markdown={isLoading ? "" : `No Zed app detected`} />;
    }

    if (!dbPath || !fs.existsSync(dbPath)) {
      return <Detail markdown="Zed Workspaces Database file not found" />;
    }

    if (!isDbSupported) {
      return <Detail markdown="Please update Zed to the latest version" />;
    }

    return (
      <ZedContext.Provider
        value={{
          app,
          isDbSupported,
          workspaceDbVersion,
          dbPath,
        }}
      >
        <Component {...props} />
      </ZedContext.Provider>
    );
  };
};

export function useZedContext() {
  const context = useContext(ZedContext);

  if (!context) {
    throw new Error("useZedContext must be used within a ZedContext.Provider");
  }

  return context;
}
