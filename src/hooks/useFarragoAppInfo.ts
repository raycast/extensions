import { Application } from "@raycast/api";
import { useEffect, useState } from "react";
import { findFarrago, isFarragoRunning } from "../utils/helpers";

export function useFarragoAppInfo() {
  const [app, setApp] = useState<Application | undefined>();
  const [appExists, setAppExists] = useState(false);
  const [appIsRunning, setAppIsRunning] = useState(false);
  const [checkedExists, setCheckedExists] = useState(false);
  const [checkedRunning, setCheckedRunning] = useState(false);
  const loading = !checkedExists || !checkedRunning;

  useEffect(() => {
    findFarrago().then((app) => {
      setApp(app);
      setAppExists(!!app);
      setCheckedExists(true);
    });
    isFarragoRunning().then((isRunning) => {
      setAppIsRunning(isRunning);
      setCheckedRunning(true);
    });
  }, []);

  return {
    loading,
    app,
    appExists,
    appIsRunning,
    checkedExists,
    checkedRunning,
  };
}
