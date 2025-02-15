// components/warmup/WarmupItem.tsx
import { List } from "@raycast/api";
import { WarmupSet } from "../../types/warmup";
import { formatWeight } from "../../utils/formatting";
import { WARMUP_SCHEMES } from "../../constants/warmup";

interface WarmupItemProps {
  set: WarmupSet;
  unitSystem: "kg" | "lbs";
}

export const WarmupItem: React.FC<WarmupItemProps> = ({ set, unitSystem }) => (
  <List.Item
    title={set.isWorkingSet ? "Working Set" : `Warmup Set ${set.setNumber}`}
    subtitle={`${formatWeight(set.weight, unitSystem)} × ${set.reps}`}
    accessories={[
      {
        tag: {
          value: `${(set.percentage * 100).toFixed(0)}%`,
          color: WARMUP_SCHEMES[set.setNumber - 1].color,
        },
      },
    ]}
  />
);
