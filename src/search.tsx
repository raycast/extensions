import { List } from "@raycast/api";
import { SearchCommand } from "./commands/search";
import { ServicesProvider } from "./contexts/servicesContext";
import { withFarragoRunning } from "./contexts/appInfoContext";

export default withFarragoRunning(
  () => (
    <ServicesProvider>
      <SearchCommand />
    </ServicesProvider>
  ),
  { LoadingComponent: List },
);
