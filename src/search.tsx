import { SearchCommand } from "./commands/search";
import { ServicesProvider } from "./contexts/servicesContext";

export default function Command() {
  return (
    <ServicesProvider>
      <SearchCommand />
    </ServicesProvider>
  );
}
