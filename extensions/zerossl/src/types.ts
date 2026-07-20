enum CertificateType {
  single90Days = "1",
  wildcard90Days = "2",
  multiDomain90Days = "3",
  single1Year = "4",
  wildcard1Year = "5",
  multiDomain1Year = "6",
  acme90Days = "7",
}
type CertificateStatus = "draft" | "pending_validation" | "issued" | "cancelled" | "revoked" | "expired";
export type SSLCertificate = {
  id: string;
  type: CertificateType;
  common_name: string;
  additional_domains: string;
  created: string;
  expires: string;
  status: CertificateStatus;
};

export type ValidateCSRResponse =
  | {
      valid: true;
      error: null;
      csrResponse: string[];
    }
  | {
      valid: false;
      error: string;
      csrResponse: null;
    };

export type PaginatedResult<T> = {
  total_count: number;
  result_count: number;
  page: number;
  limit: number;
  results: T[];
};

export type ErrorResult = {
  success: false;
  error: {
    code: number;
    type: string;
    info?: string;
  };
};
