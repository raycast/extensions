// components/max/DetailView.tsx
import { List } from "@raycast/api";
import { MaxResult } from "../../types/max";
import { formatWeight } from "../../utils/formatting";

interface DetailViewProps {
  result: MaxResult;
  unitSystem: "kg" | "lbs";
}

export const DetailView: React.FC<DetailViewProps> = ({ result, unitSystem }) => (
  <List.Item.Detail
    markdown={result.text ?? ""}
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Details" />
        {result.scheme && (
          <List.Item.Detail.Metadata.Label
            title="Repetition Scheme"
            icon={{ source: result.icon, tintColor: result.tintColor }}
            text={result.scheme}
          />
        )}
        <List.Item.Detail.Metadata.Label title="Weight" text={formatWeight(result.value, unitSystem)} />
        <List.Item.Detail.Metadata.Label title="Repetitions" text={result.label} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Link
          title="Based on Epley Formula"
          target="https://en.wikipedia.org/wiki/One-repetition_maximum"
          text="Wikipedia"
        />
      </List.Item.Detail.Metadata>
    }
  />
);
