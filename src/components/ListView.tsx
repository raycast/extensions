import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { ResultProp } from "../utils/caclulateRepMax";
import { useState } from "react";

type ListViewProps = {
  searchText: string;
  setSearchText: (text: string) => void;
  results: ResultProp[];
};

const ActionPanelWrapper: React.FC<{ setShowingDetail: React.Dispatch<React.SetStateAction<boolean>> }> = ({
  setShowingDetail,
}) => (
  <ActionPanel>
    <Action title="Toggle Detail" onAction={() => setShowingDetail((prevShowing: boolean) => !prevShowing)} />
  </ActionPanel>
);

const ListView: React.FC<ListViewProps> = ({ searchText, setSearchText, results }) => {
  const [showingDetail, setShowingDetail] = useState(false);
  return (
    <List
      searchBarPlaceholder="weight * repetitions"
      onSearchTextChange={setSearchText}
      searchText={searchText}
      isShowingDetail={showingDetail}
    >
      {results.length > 1 ? (
        results.map((result, index) => (
          <List.Item
            key={index}
            actions={<ActionPanelWrapper setShowingDetail={setShowingDetail} />}
            icon={{ source: result.icon, tintColor: result.tintColor }}
            subtitle={`${result.value.toFixed(2)} kg`}
            title={`${result.label}`}
            accessories={[
              {
                tag: { value: `${result.percentage ? result.percentage * 100 : ""}%`, color: Color.SecondaryText },
                tooltip: `${result.percentage ? result.percentage * 100 : ""}% of your one rep max`,
              },
            ]}
            detail={
              <List.Item.Detail
                markdown={result.text}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Details" />
                    <List.Item.Detail.Metadata.Label
                      title="Repetition Scheme"
                      icon={{ source: result.icon, tintColor: result.tintColor }}
                      text={result.scheme}
                    />
                    <List.Item.Detail.Metadata.Label title="Weight" text={`${result.value.toFixed(2)} kg`} />
                    <List.Item.Detail.Metadata.Label title="Repetitions" text={`${result.label}`} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link
                      title="Based on Epley Formula"
                      target="https://en.wikipedia.org/wiki/One-repetition_maximum"
                      text="Wikipedia"
                    />
                    <List.Item.Detail.Metadata.Separator />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        ))
      ) : (
        <List.EmptyView
          title="Enter your values."
          description="Your input should match the format weight x repetitions e.g. 70*6"
          icon={Icon.ExclamationMark}
        />
      )}
    </List>
  );
};

export default ListView;
