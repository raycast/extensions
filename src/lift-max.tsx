// lift-max.tsx
import { LaunchProps, getPreferenceValues } from "@raycast/api";
import { MaxCommandArgs } from "./types/max";
import { ListView } from "./components/max/ListView";
import { useRepMaxCalculator } from "./hooks/useRepMaxCalculator";
import { Preferences } from "./types/shared";

export default function Command(props: LaunchProps<{ arguments: MaxCommandArgs }>) {
  const { reps, weight } = props.arguments;
  const { searchText, setSearchText, results } = useRepMaxCalculator(weight, reps);

  // Log preferences immediately when the command runs
  const preferences = getPreferenceValues<Preferences>();
  console.log("Current Unit System:", preferences.unitSystem);

  return <ListView searchText={searchText} setSearchText={setSearchText} results={results} />;
}
