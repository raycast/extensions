import { Action, ActionPanel, Color, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { ErrorResult, PaginatedResult, SSLCertificate } from "./types";

const {access_key} = getPreferenceValues<ExtensionPreferences>();
const request = async <T,>(endpoint: string) => {
  const response = await fetch(`https://api.zerossl.com/${endpoint}?access_key=${access_key}`);
  const result = await response.json();
  if (!response.ok) {
    const {error} = result as ErrorResult;
    throw new Error(error.info || error.type);
  }
  return result as T;
}

export default function ManageCertificates() {
  const {isLoading, data: certificates} = useCachedPromise(async() => {
    const result = await request<PaginatedResult<SSLCertificate>>("certificates");
    return result.results;
  }, [], {
    initialData: []
  })

  return <List isLoading={isLoading}>
    {certificates.map(certificate => <List.Item key={certificate.id} icon={getFavicon(certificate.common_name)} title={certificate.common_name} accessories={[
      {icon: certificate.status==="issued" ? {source:Icon.CheckCircle, tintColor: Color.Green} : undefined, text: certificate.status},
      {date: new Date(certificate.expires), tooltip: "Expires"}
    ]} actions={<ActionPanel>
      <Action.Push icon={Icon.Document} title="View Certificate" target={<ViewCertificate certificate={certificate} />} />
      <Action icon={Icon.QuestionMark} title="Get Domain Verification Status" onAction={async() => {
        const toast = await showToast(Toast.Style.Animated, "Getting Status");
        try {
          const result = await request<{  "validation_completed": 0|1}>(`certificates/${certificate.id}/status`);
          toast.style = Toast.Style.Success;
          toast.title = "Complete";
          toast.message = result.validation_completed===0 ? "❌" : "✅";
        } catch (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Failed";
          toast.message = `${error}`
        }
      }} />
    </ActionPanel>} />)}
  </List>
}

function ViewCertificate({certificate}: {certificate: SSLCertificate}) {
  const {isLoading, data} = useCachedPromise(async(id: string) => {
    const result = await request<{"certificate.crt": string; "ca_bundle.crt": string}>(`certificates/${id}/download/return`);
    return result;
  },[certificate.id])

  return <List isLoading={isLoading} isShowingDetail>
    {data && Object.entries(data).map(([key, val]) => <List.Item key={key} icon={Icon.Text} title={key} detail={<List.Item.Detail markdown={val} />} actions={<ActionPanel>
      <Action.CopyToClipboard content={val} />
    </ActionPanel>} />)}
  </List>
}