import { Detail, showToast, Toast } from "@raycast/api";
import { DEFAULT_ERROR_TITLE, UnknownErrorText } from "../../constants";

export function UnknownError({ message }: { message: string }) {
  showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, message);

  return <Detail markdown={UnknownErrorText} />;
}
