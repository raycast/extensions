import { showToast, Toast, Detail } from "@raycast/api";
import { useEffect } from "react";

interface IAMMembersByPrincipalViewProps {
  projectId: string;
  gcloudPath: string;
  resourceName?: string;
  resourceType?: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function IAMMembersByPrincipalView(_: IAMMembersByPrincipalViewProps) {
  useEffect(() => {
    showToast({
      style: Toast.Style.Failure,
      title: "Not implemented",
      message: "This view is under development",
    });
  }, []);

  return <Detail markdown="# IAM Members by Principal View\n\nThis view is currently under development." />;
}
