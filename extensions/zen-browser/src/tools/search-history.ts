import { getHistory } from "../util";

type Input = {
  searchText?: string;
  limitResults?: number;
};

const tool = async ({ searchText, limitResults }: Input) => {
  return await getHistory(searchText, limitResults);
};

export default tool;
