import { Color, Icon, LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { calculateRepMax, calculateRepMaxInitial } from "./utils/caclulateRepMax";
import ListView from "./components/ListView";

export default function Command(props: LaunchProps<{ arguments: Arguments.RepMax }>) {
  const [searchText, setSearchText] = useState("");
  const { reps, weight } = props.arguments;
  const [results, setResults] = useState<
    { label: string; value: number; tintColor: Color; icon: Icon; percentage?: number }[]
  >([]);

  useEffect(() => {
    if (reps && weight) {
      setResults(calculateRepMaxInitial(weight, reps));
      setSearchText(`${weight}*${reps}`);
    }
  }, [reps, weight]);

  useEffect(() => {
    setResults(calculateRepMax(searchText));
  }, [searchText]);

  return <ListView searchText={searchText} setSearchText={setSearchText} results={results} />;
}
