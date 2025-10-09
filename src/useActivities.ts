import { Activity } from "./types";
import { useEffect, useState } from "react";
import { apiListAllActivities } from "./api-early";
import { showError } from "./utils";

type State = {
  isLoadingActivities: boolean;
  activities: Activity[];
};

export const useActivities = () => {
  const [{ activities, isLoadingActivities }, setState] = useState<State>({
    activities: [],
    isLoadingActivities: true,
  });

  useEffect(() => {
    apiListAllActivities()
      .then(activities => setState(prev => ({ ...prev, activities })))
      .catch(showError)
      .finally(() => setState(prev => ({ ...prev, isLoadingActivities: false })));
  }, []);

  return { activities, isLoadingActivities };
};
