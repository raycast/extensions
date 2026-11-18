import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { SSLCertificate } from "./types";
import { getDomainVerificationStatus, listCertificates, viewCertificate } from "./zerossl";

export default function ManageCertificates() {
  const { isLoading, data: certificates } = useCachedPromise(
    async () => {
      const result = await listCertificates();
      return result.results;
    },
    [],
    {
      initialData: [],
    },
  );

  return (
    <List isLoading={isLoading}>
      {certificates.map((certificate) => (
        <List.Item
          key={certificate.id}
          icon={getFavicon(certificate.common_name)}
          title={certificate.common_name}
          accessories={[
            {
              icon: certificate.status === "issued" ? { source: Icon.CheckCircle, tintColor: Color.Green } : undefined,
              text: certificate.status,
            },
            { date: new Date(certificate.expires), tooltip: "Expires" },
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Document}
                title="View Certificate"
                target={<ViewCertificate certificate={certificate} />}
              />
              <Action
                icon={Icon.QuestionMark}
                title="Get Domain Verification Status"
                onAction={async () => {
                  const toast = await showToast(Toast.Style.Animated, "Getting Status");
                  try {
                    const result = await getDomainVerificationStatus(certificate.id);
                    toast.style = Toast.Style.Success;
                    toast.title = "Complete";
                    toast.message = result.validation_completed === 0 ? "❌" : "✅";
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = "Failed";
                    toast.message = `${error}`;
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function ViewCertificate({ certificate }: { certificate: SSLCertificate }) {
  const { isLoading, data } = useCachedPromise(
    async (certificateId: string) => {
      const result = await viewCertificate(certificateId);
      return result;
    },
    [certificate.id],
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`Manage Certificates / ${certificate.id.slice(0, 3)}...${certificate.id.slice(-3)} / View`}
    >
      {data &&
        Object.entries(data).map(([key, val]) => (
          <List.Item
            key={key}
            icon={Icon.Text}
            title={key}
            detail={<List.Item.Detail markdown={val} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={val} />
              </ActionPanel>
            }
          />
        ))}
    </List>
  );
}
