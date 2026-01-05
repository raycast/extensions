package tls

import (
	utls "github.com/metacubex/utls"
)

type ClientAuthType = utls.ClientAuthType

const (
	NoClientCert               = utls.NoClientCert
	RequestClientCert          = utls.RequestClientCert
	RequireAnyClientCert       = utls.RequireAnyClientCert
	VerifyClientCertIfGiven    = utls.VerifyClientCertIfGiven
	RequireAndVerifyClientCert = utls.RequireAndVerifyClientCert
)

func ClientAuthTypeFromString(s string) ClientAuthType {
	switch s {
	case "request":
		return RequestClientCert
	case "require-any":
		return RequireAnyClientCert
	case "verify-if-given":
		return VerifyClientCertIfGiven
	case "require-and-verify":
		return RequireAndVerifyClientCert
	default:
		return NoClientCert
	}
}

func ClientAuthTypeToString(t ClientAuthType) string {
	switch t {
	case RequestClientCert:
		return "request"
	case RequireAnyClientCert:
		return "require-any"
	case VerifyClientCertIfGiven:
		return "verify-if-given"
	case RequireAndVerifyClientCert:
		return "require-and-verify"
	default:
		return ""
	}
}
