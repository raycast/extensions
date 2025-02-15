// components/warmup/WarmupItem.tsx
import { List, Icon } from "@raycast/api";
import { WarmupSet } from "../../types/warmup";
import { formatWeight } from "../../utils/formatting";
import { WARMUP_SCHEMES } from "../../constants/warmup";
import { DetailView } from "./DetailView";

interface WarmupItemProps {
  set: WarmupSet;
  unitSystem: "kg" | "lbs";
}

export const WarmupItem: React.FC<WarmupItemProps> = ({ set, unitSystem }) => {
  const { color } = WARMUP_SCHEMES[set.setNumber - 1];
  const isWorkingSet = set.percentage === 1.0;

  return (
    <List.Item
      icon={{
        source: Icon.Weights,
        tintColor: color,
      }}
      title={isWorkingSet ? "Working Set" : `Warmup Set ${set.setNumber}`}
      subtitle={`${formatWeight(set.weight, unitSystem)} × ${set.reps} ${set.reps === 1 ? "rep" : "reps"}`}
      accessories={[
        {
          tag: {
            value: `${(set.percentage * 100).toFixed(0)}%`,
            color: color,
          },
        },
      ]}
      detail={<DetailView set={set} unitSystem={unitSystem} />}
    />
  );
};
