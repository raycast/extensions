// components/max/ListView.tsx
import { List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { MaxResult } from "../../types/max";
import { Preferences } from "../../types/shared";
import { MaxItem } from "./MaxItem";
import { EmptyView } from "../shared/EmptyView";

interface ListViewProps {
  searchText: string;
  setSearchText: (text: string) => void;
  results: MaxResult[];
}

export const ListView: React.FC<ListViewProps> = ({ searchText, setSearchText, results }) => {
  const [showingDetail, setShowingDetail] = useState(false);
  const { unitSystem } = getPreferenceValues<Preferences>();

  console.log("ListView Results:", results);
  console.log("Results Length:", results.length);

  return (
    <List
      searchBarPlaceholder="Enter weight * repetitions (e.g. 70*6)"
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isShowingDetail={showingDetail}
    >
      {results.length > 0 ? (
        results.map((result, index) => (
          <MaxItem key={index} result={result} unitSystem={unitSystem} setShowingDetail={setShowingDetail} />
        ))
      ) : (
        <EmptyView />
      )}
    </List>
  );
};
