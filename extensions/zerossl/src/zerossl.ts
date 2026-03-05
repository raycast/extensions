import { getPreferenceValues } from "@raycast/api";
import { ErrorResult, PaginatedResult, SSLCertificate, ValidateCSRResponse } from "./types";

const { access_key } = getPreferenceValues<ExtensionPreferences>();
const request = async <T>(endpoint: string, options?: RequestInit) => {
  const response = await fetch(`https://api.zerossl.com/${endpoint}?access_key=${access_key}`, {
    method: options?.method,
    headers:
      options?.method === "POST"
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
    body: options?.body,
  });
  const result = await response.json();
  if (!response.ok) {
    const { error } = result as ErrorResult;
    throw new Error(error.info || error.type);
  }
  return result as T;
};

export const listCertificates = () => request<PaginatedResult<SSLCertificate>>("certificates");
export const getDomainVerificationStatus = (certificateId: string) =>
  request<{ validation_completed: 0 | 1 }>(`certificates/${certificateId}/status`);
export const viewCertificate = (certificateId: string) =>
  request<{ "certificate.crt": string; "ca_bundle.crt": string }>(`certificates/${certificateId}/download/return`);
export const validateCSR = (csr: string) =>
  request<ValidateCSRResponse>("validation/csr", {
    method: "POST",
    body: JSON.stringify({ csr }),
  });
