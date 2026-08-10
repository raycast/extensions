import { showFailureToast } from "@raycast/utils";
import { DEFAULT_LIMIT } from "./constants";

export default async function checkIfDefaultLimitIsValid() {
  let limit_error = "";
  if (!Number(DEFAULT_LIMIT)) limit_error = "Default Limit in Preferences must be a number";
  else if (Number(DEFAULT_LIMIT) < 0) limit_error = "Default Limit in Preferences must be greater than zero";
  if (limit_error) {
    await showFailureToast(limit_error, { title: "Error" });
    return { error: limit_error };
  } else return {};
}
