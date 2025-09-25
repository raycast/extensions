import React, { createContext, useContext, useRef, useEffect, useState, ReactNode } from "react";
import { ClientManager } from "../api/clientManager";
import useInterval from "../hooks/useInterval";

type ClientManagerContextType = { cm: ClientManager | null; latestDbUpdate: number | null };

const ClientManagerContext = createContext<ClientManagerContextType>({
  cm: null,
  latestDbUpdate: null,
});

type ClientManagerProviderProps = {
  children: ReactNode;
};

export const ClientManagerProvider: React.FC<ClientManagerProviderProps> = ({ children }) => {
  const clientManagerRef = useRef<ClientManager>(null);
  const [clientManager, setClientManager] = useState<ClientManager | null>(null);
  const [latestDbUpdate, setLatestDbUpdate] = useState<number | null>(null);

  useEffect(() => {
    clientManagerRef.current = new ClientManager();
    const oldRef = clientManagerRef.current;
    clientManagerRef.current.readaptToPreferences();
    clientManagerRef.current.addEventListener("dbRefreshed", () => {
      setClientManager(clientManagerRef.current);
      setLatestDbUpdate(clientManagerRef.current?.fileParser.lastParsedSets!);
    });
    setClientManager(clientManagerRef.current);
    setLatestDbUpdate(clientManagerRef.current?.fileParser.lastParsedSets!);

    return () => {
      oldRef?.closeOscClient();
    };
  }, []);

  useInterval(() => {
    clientManagerRef.current?.readaptToPreferences();
  }, 10000);

  return (
    <ClientManagerContext.Provider
      value={{
        cm: clientManager,
        latestDbUpdate,
      }}
    >
      {children}
    </ClientManagerContext.Provider>
  );
};

export const useClientManager = (): ClientManagerContextType => {
  const context = useContext(ClientManagerContext);
  if (context === undefined) {
    throw new Error("useClientManager must be used within a ClientManagerProvider");
  }
  return context;
};
