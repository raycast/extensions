import CreateMeetingForm, { MeetingFormValues } from "./components/CreateMeetingForm";
import { withZoomAuth } from "./components/withZoomAuth";

export default function Command({ draftValues }: { draftValues?: MeetingFormValues }) {
  return withZoomAuth(<CreateMeetingForm enableDrafts={true} draftValues={draftValues} />);
}
