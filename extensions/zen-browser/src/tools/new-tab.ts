import { openNewTab } from "../actions";

type Input = {
  searchText?: string;
};

const tool = async ({ searchText }: Input) => {
  await openNewTab(searchText ? searchText : "");
};

export default tool;
