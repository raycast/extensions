import { LaunchProps } from "@raycast/api";
import { StockDetailView } from "./components/StockDetailView";

interface QuickLookupArguments {
  ticker: string;
}

export default function QuickLookup(props: LaunchProps<{ arguments: QuickLookupArguments }>) {
  return <StockDetailView ticker={props.arguments.ticker} />;
}
