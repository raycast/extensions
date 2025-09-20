import { CardList } from "./components/CardList";
import { useCardSearch } from "./hooks/useCardSearch";

export default function Command() {
  const { isLoading, data, searchText, setSearchText } = useCardSearch();
  return <CardList isLoading={isLoading} data={data} searchText={searchText} setSearchText={setSearchText} />;
}
