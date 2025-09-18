import { useEffect, useRef, useState } from "react";
import { ClientManager } from "../api/clientManager";
import useInterval from "./useInterval";

type Options = {
  onInitialized: (cm: ClientManager) => void;
};

const READAPT_INTERVAL = 10000;

export function useClientManager(options: Options) {
  const clientManagerRef = useRef<ClientManager>(null);
  const [, setInitialized] = useState(false);

  useEffect(() => {
    console.log("🟥 running useClientManager effect");
    clientManagerRef.current = new ClientManager();
    options.onInitialized(clientManagerRef.current);
    setInitialized(true);

    return () => {
      console.log("cleanup...");
      clientManagerRef.current?.closeOscClient();
    };
  }, []);

  useInterval(() => {
    clientManagerRef.current?.readaptToPreferences();
  }, READAPT_INTERVAL);

  return clientManagerRef.current;
}
