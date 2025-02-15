// lift-warmup.tsx
import { LaunchProps, showToast, Toast } from "@raycast/api";
import { WarmupCommandArgs } from "./types/warmup";
import { ListView } from "./components/warmup/ListView";
import { calculateWarmupSets } from "./utils/warmup";
import { VALIDATION } from "./constants/shared";

export default function Command(props: LaunchProps<{ arguments: WarmupCommandArgs }>) {
  const { weight } = props.arguments;

  try {
    const workingWeight = parseFloat(weight);
    if (isNaN(workingWeight)) {
      throw new Error("Invalid weight value");
    }

    if (workingWeight < VALIDATION.WEIGHT.MIN || workingWeight > VALIDATION.WEIGHT.MAX) {
      throw new Error(VALIDATION.getWeightError());
    }

    const warmupSets = calculateWarmupSets(workingWeight);
    return <ListView sets={warmupSets} />;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error calculating warmup sets",
      message: error instanceof Error ? error.message : "Invalid input",
    });

    return <ListView sets={[]} />;
  }
}
