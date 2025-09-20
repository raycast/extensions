import CreateMeetingForm from "./components/CreateMeetingForm";
import { withZoomAuth } from "./components/withZoomAuth";

export default withZoomAuth(CreateMeetingForm);
