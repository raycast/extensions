// components/volume/ListView.tsx
import { List, getPreferenceValues, Icon } from "@raycast/api";
import { useState } from "react";
import { VolumeResult } from "../../types/volume";
import { Preferences } from "../../types/shared";
import { VolumeItem } from "./VolumeItem";

interface ListViewProps {
  results: VolumeResult[];
}

export const ListView: React.FC<ListViewProps> = ({ results }) => {
  const [showingDetail, setShowingDetail] = useState(false);
  const { unitSystem } = getPreferenceValues<Preferences>();

  return (
    <List isShowingDetail={showingDetail}>
      {results.length > 0 ? (
        results.map((result, index) => (
          <VolumeItem
            key={index}
            result={result}
            results={results}
            unitSystem={unitSystem}
            setShowingDetail={setShowingDetail}
          />
        ))
      ) : (
        <List.EmptyView
          title="No volume schemes available"
          description="Please enter a valid one rep max weight"
          icon={Icon.ExclamationMark}
        />
      )}
    </List>
  );
};
