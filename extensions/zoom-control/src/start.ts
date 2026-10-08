import { showHUD, showToast, Toast } from "@raycast/api";
import { zoomMenu, ZoomMenuResult } from "./zoom-meeting";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  const res = await zoomMenu("zoom.us", "Start Meeting");
  switch (res) {
    case ZoomMenuResult.Executed:
      showHUD("Started new zoom meeting");
      break;
    case ZoomMenuResult.Menu2Disabled:
      showToast({
        style: Toast.Style.Failure,
        title: "Can't start meeting, leave any current meetings",
      });
      break;
    case ZoomMenuResult.NoMenu1:
    case ZoomMenuResult.NoMenu2:
      showFailureToast("Zoom menu not found");
      break;
    case ZoomMenuResult.HandledError:
      break;
    default:
      showFailureToast(res);
      break;
  }
}
