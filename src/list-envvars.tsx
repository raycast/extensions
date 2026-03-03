import { List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { EnvVarItem } from "./components/EnvVarItem";
import { getAllEnvVars } from "./utils/powershell";
import { EnvVar } from "./utils/types";

type FilterScope = "All" | "User" | "Machine";

export default function ListEnvVars() {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterScope>("All");

  const loadVars = useCallback(async () => {
    setIsLoading(true);
    try {
      const userVars = getAllEnvVars("User");
      const machineVars = getAllEnvVars("Machine");
      setVars([...userVars, ...machineVars]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load variables",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVars();
  }, [loadVars]);

  const userVars = vars.filter((v) => v.scope === "User");
  const machineVars = vars.filter((v) => v.scope === "Machine");

  const showUser = filter === "All" || filter === "User";
  const showMachine = filter === "All" || filter === "Machine";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by scope"
          onChange={(value) => setFilter(value as FilterScope)}
        >
          <List.Dropdown.Item title="All" value="All" />
          <List.Dropdown.Item title="User" value="User" />
          <List.Dropdown.Item title="System" value="Machine" />
        </List.Dropdown>
      }
    >
      {showUser && (
        <List.Section title="User Variables" subtitle={`${userVars.length}`}>
          {userVars.map((v) => (
            <EnvVarItem
              key={`user-${v.name}`}
              envVar={v}
              onRefresh={loadVars}
            />
          ))}
        </List.Section>
      )}
      {showMachine && (
        <List.Section
          title="System Variables"
          subtitle={`${machineVars.length}`}
        >
          {machineVars.map((v) => (
            <EnvVarItem
              key={`machine-${v.name}`}
              envVar={v}
              onRefresh={loadVars}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
