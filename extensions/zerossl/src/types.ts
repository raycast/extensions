enum CertificateType {
    single90Days="1",
    wildcard90Days="2",
    multiDomain90Days="3",
    single1Year="4",
    wildcard1Year="5",
    multiDomain1Year="6",
    acme90Days="7",
}
type CertificateStatus = "draft"|"pending_validation"|"issued"|"cancelled"|"revoked"|"expired";
export type SSLCertificate = {
      "id": string
      "type": CertificateType
      "common_name": string
      "additional_domains": string
      "created": string
      "expires": string
      "status": CertificateStatus;
    //   "validation_type": "EMAIL",
    //   "validation_emails": "admin@kamayi.com.pk,admin@kamayi.com.pk",
    //   "replacement_for": "",
    //   "fingerprint_sha1": "d031f8cd7f607ca93be83ab60b5e417f0c4db973",
    //   "brand_validation": null,
    //   "validation": {
    //     "email_validation": {
    //       "kamayi.com.pk": [
    //         "admin@kamayi.com.pk",
    //         "administrator@kamayi.com.pk",
    //         "hostmaster@kamayi.com.pk",
    //         "postmaster@kamayi.com.pk",
    //         "webmaster@kamayi.com.pk"
    //       ]
    //     },
    //     "other_methods": {
    //       "kamayi.com.pk": {
    //         "file_validation_url_http": "http://kamayi.com.pk/.well-known/pki-validation/0F70760EEC50DF6725F9592F26D7B0F3.txt",
    //         "file_validation_url_https": "https://kamayi.com.pk/.well-known/pki-validation/0F70760EEC50DF6725F9592F26D7B0F3.txt",
    //         "file_validation_content": [
    //           "1397F9DA233B277153AE0B68083EFAC7A53D6958F296128163058EA67EBB88CC",
    //           "comodoca.com",
    //           "661862d3f04226a"
    //         ],
    //         "cname_validation_p1": "_0F70760EEC50DF6725F9592F26D7B0F3.kamayi.com.pk",
    //         "cname_validation_p2": "1397F9DA233B277153AE0B68083EFAC7.A53D6958F296128163058EA67EBB88CC.661862d3f04226a.comodoca.com"
    //       },
    //       "www.kamayi.com.pk": {
    //         "file_validation_url_http": "http://www.kamayi.com.pk/.well-known/pki-validation/0F70760EEC50DF6725F9592F26D7B0F3.txt",
    //         "file_validation_url_https": "https://www.kamayi.com.pk/.well-known/pki-validation/0F70760EEC50DF6725F9592F26D7B0F3.txt",
    //         "file_validation_content": [
    //           "1397F9DA233B277153AE0B68083EFAC7A53D6958F296128163058EA67EBB88CC",
    //           "comodoca.com",
    //           "661862d3f04226a"
    //         ],
    //         "cname_validation_p1": "_0F70760EEC50DF6725F9592F26D7B0F3.www.kamayi.com.pk",
    //         "cname_validation_p2": "1397F9DA233B277153AE0B68083EFAC7.A53D6958F296128163058EA67EBB88CC.661862d3f04226a.comodoca.com"
    //       }
    //     }
    //   },
    //   "signature_algorithm_properties": "sha384WithRSAEncryption:2048"
    }

    export type PaginatedResult<T> = {
    "total_count": number
    "result_count": number
    "page": number
    "limit": number
results: T[]
    }

export type ErrorResult =
{
  "success": false,
  "error": {
    "code": number,
    "type": string
    "info"?: string
  }
}