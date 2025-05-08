import { openNewTab } from "../actions";

type Input = {
  searchText?: string;
};

const tool = async ({ searchText }: Input) => {
  console.log("Opening new tab with search text:", searchText);
  await openNewTab(searchText ? searchText : "");
};

export default tool;
