import { showHUD, showToast, Toast } from "@raycast/api";
import { zoomMenu, ZoomMenuResult } from "./zoom-meeting";
import { showFailureToast } from "@raycast/utils";

export default async function main() {
  const res = await zoomMenu("Meeting", "Start Share");
  switch (res) {
    case ZoomMenuResult.Executed:
      showHUD("Started screen share in active meeting 🖥");
      return;
    case ZoomMenuResult.NoMenu1:
      // We're not in a meeting, try joining an existing meeting
      // with the "Screen Share" option.
      await topLevelShareScreen();
      return;
    case ZoomMenuResult.Menu2Disabled:
    case ZoomMenuResult.NoMenu2:
      showToast({
        style: Toast.Style.Failure,
        title: "Can't start share, may already be sharing",
      });
      break;
    case ZoomMenuResult.HandledError:
      break;
    default:
      showFailureToast(res);
      break;
  }
}

async function topLevelShareScreen() {
  const res = await zoomMenu("zoom.us", "Screen Share...");
  switch (res) {
    case ZoomMenuResult.Executed:
      showHUD("Started screen share in new meeting 🖥");
      break;
    case ZoomMenuResult.NoMenu1:
      // If the application is running, this shouldn't happen.
      showFailureToast("zoom menu missing");
      break;
    case ZoomMenuResult.Menu2Disabled:
    case ZoomMenuResult.NoMenu2:
      showFailureToast("Screen Share is not available");
      break;
    case ZoomMenuResult.HandledError:
      // Other errors are handled before they're returned.
      break;
    default:
      showFailureToast(res);
      break;
  }
}
