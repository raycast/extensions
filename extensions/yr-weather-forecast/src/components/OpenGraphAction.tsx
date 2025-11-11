import { Action, Icon } from "@raycast/api";
import GraphView from "../graph";

interface OpenGraphActionProps {
  name: string;
  lat: number;
  lon: number;
  onShowWelcome?: () => void;
}

export function OpenGraphAction({ name, lat, lon, onShowWelcome }: OpenGraphActionProps) {
  return (
    <Action.Push
      title="Open Graph"
      icon={Icon.BarChart}
      shortcut={{ modifiers: ["cmd"], key: "g" }}
      target={<GraphView name={name} lat={lat} lon={lon} onShowWelcome={onShowWelcome} />}
    />
  );
}
