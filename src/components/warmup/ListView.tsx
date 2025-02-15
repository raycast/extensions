// components/warmup/ListView.tsx
import { List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { WarmupSet } from "../../types/warmup";
import { Preferences } from "../../types/shared";
import { WarmupItem } from "./WarmupItem";
import { EmptyView } from "../shared/EmptyView";

interface ListViewProps {
  sets: WarmupSet[];
}

export const ListView: React.FC<ListViewProps> = ({ sets }) => {
  const [showingDetail, setShowingDetail] = useState(false);
  const { unitSystem } = getPreferenceValues<Preferences>();

  return (
    <List isShowingDetail={showingDetail}>
      {sets.length > 0 ? (
        sets.map((set) => (
          <WarmupItem
            key={set.setNumber}
            set={set}
            unitSystem={unitSystem}
            sets={sets} // Pass the full sets array
            setShowingDetail={setShowingDetail}
          />
        ))
      ) : (
        <EmptyView />
      )}
    </List>
  );
};
