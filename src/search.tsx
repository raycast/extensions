import { ClientManagerProvider } from "./contexts/clientManagerContext";
import { SearchCommand } from "./commands/search";

export default function Command() {
  return (
    <ClientManagerProvider>
      <SearchCommand />
    </ClientManagerProvider>
  );
}
