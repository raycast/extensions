import { getPreferenceValues } from "@raycast/api";
import type { User } from "../types";
import { useFetch } from "@raycast/utils";

export function useGetCurrentUser() {
  const { PERSONAL_ACCESS_TOKEN } = getPreferenceValues<Preferences>();
  const { isLoading, data: currentUser } = useFetch<User>(`https://api.zeplin.dev/v1/users/me`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PERSONAL_ACCESS_TOKEN}`,
    },
    failureToastOptions: {
      title: "Could not get current user",
    },
  });
  return { isLoading, currentUser };
}
