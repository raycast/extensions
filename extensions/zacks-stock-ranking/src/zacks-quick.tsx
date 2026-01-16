import { LaunchProps } from "@raycast/api";
import { StockDetailView } from "./components/StockDetailView";

export default function QuickLookup(props: LaunchProps<{ arguments: QuickLookupArguments }>) {
  return <StockDetailView ticker={props.arguments.ticker} />;
}
