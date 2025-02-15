// components/warmup/ListView.tsx
import { List, getPreferenceValues } from "@raycast/api";
import { WarmupSet } from "../../types/warmup";
import { Preferences } from "../../types/shared";
import { WarmupItem } from "./WarmupItem";
import { EmptyView } from "../shared/EmptyView";

interface ListViewProps {
  sets: WarmupSet[];
}

export const ListView: React.FC<ListViewProps> = ({ sets }) => {
  const { unitSystem } = getPreferenceValues<Preferences>();

  return (
    <List>
      {sets.length > 0 ? (
        sets.map((set) => <WarmupItem key={set.setNumber} set={set} unitSystem={unitSystem} />)
      ) : (
        <EmptyView />
      )}
    </List>
  );
};
