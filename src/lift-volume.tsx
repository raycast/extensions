// lift-volume.tsx
import { LaunchProps, showToast, Toast } from "@raycast/api";
import { VolumeCommandArgs } from "./types/volume";
import { ListView } from "./components/volume/ListView";
import { calculateVolume } from "./utils/volume";
import { VALIDATION } from "./constants/shared";

export default function Command(props: LaunchProps<{ arguments: VolumeCommandArgs }>) {
  const { oneRepMax } = props.arguments;

  try {
    const maxWeight = parseFloat(oneRepMax);
    if (isNaN(maxWeight)) {
      throw new Error("Invalid weight value");
    }

    if (maxWeight < VALIDATION.WEIGHT.MIN || maxWeight > VALIDATION.WEIGHT.MAX) {
      throw new Error(VALIDATION.getWeightError());
    }

    const volumeResults = calculateVolume(maxWeight);
    return <ListView results={volumeResults} />;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Error calculating training volume",
      message: error instanceof Error ? error.message : "Invalid input",
    });

    return <ListView results={[]} />;
  }
}
