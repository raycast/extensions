import { getPreferenceValues } from "@raycast/api";
import { getHistory } from "../util";

type Input = {
  searchText?: string;
};

const tool = async ({ searchText }: Input) => {
  const { aiSearchHistoryLimitResults } = getPreferenceValues<Preferences>();
  if (parseInt(aiSearchHistoryLimitResults) > 0) {
    return await getHistory(searchText, parseInt(aiSearchHistoryLimitResults));
  } else {
    if (aiSearchHistoryLimitResults == "0") {
      return "You have disabled the AI search history, which limits the results to zero. Please adjust this setting in the preferences.";
    }
    return "The limit for the AI search history is incorrect. Please adjust this setting in the preferences.";
  }
};

export default tool;
