package tls

import (
	"crypto/tls"
	"net"

	"github.com/metacubex/mihomo/common/once"
	"github.com/metacubex/mihomo/common/utils"
	"github.com/metacubex/mihomo/log"

	utls "github.com/metacubex/utls"
	"github.com/mroth/weightedrand/v2"
)

type Conn = utls.Conn
type UConn = utls.UConn
type UClientHelloID = utls.ClientHelloID

const VersionTLS12 = utls.VersionTLS12
const VersionTLS13 = utls.VersionTLS13

func Client(c net.Conn, config *utls.Config) *Conn {
	return utls.Client(c, config)
}

func UClient(c net.Conn, config *utls.Config, fingerprint UClientHelloID) *UConn {
	return utls.UClient(c, config, fingerprint)
}

func Server(c net.Conn, config *utls.Config) *Conn {
	return utls.Server(c, config)
}

func NewListener(inner net.Listener, config *Config) net.Listener {
	return utls.NewListener(inner, config)
}

func GetFingerprint(clientFingerprint string) (UClientHelloID, bool) {
	if len(clientFingerprint) == 0 {
		clientFingerprint = globalFingerprint
	}
	if len(clientFingerprint) == 0 || clientFingerprint == "none" {
		return UClientHelloID{}, false
	}

	if clientFingerprint == "random" {
		fingerprint := randomFingerprint()
		log.Debugln("use initial random HelloID:%s", fingerprint.Client)
		return fingerprint, true
	}

	if fingerprint, ok := fingerprints[clientFingerprint]; ok {
		log.Debugln("use specified fingerprint:%s", fingerprint.Client)
		return fingerprint, true
	} else {
		log.Warnln("wrong clientFingerprint:%s", clientFingerprint)
		return UClientHelloID{}, false
	}
}

var randomFingerprint = once.OnceValue(func() UClientHelloID {
	chooser, _ := weightedrand.NewChooser(
		weightedrand.NewChoice("chrome", 6),
		weightedrand.NewChoice("safari", 3),
		weightedrand.NewChoice("ios", 2),
		weightedrand.NewChoice("firefox", 1),
	)
	initClient := chooser.Pick()
	log.Debugln("initial random HelloID:%s", initClient)
	fingerprint, ok := fingerprints[initClient]
	if !ok {
		log.Warnln("error in initial random HelloID:%s", initClient)
	}
	return fingerprint
})

var HelloChrome_Auto = utls.HelloChrome_Auto
var HelloChrome_120 = utls.HelloChrome_120 // special fingerprint for some old protocols doesn't work with HelloChrome_Auto

var fingerprints = map[string]UClientHelloID{
	"chrome":  utls.HelloChrome_Auto,
	"firefox": utls.HelloFirefox_Auto,
	"safari":  utls.HelloSafari_Auto,
	"ios":     utls.HelloIOS_Auto,
	"android": utls.HelloAndroid_11_OkHttp,
	"edge":    utls.HelloEdge_Auto,
	"360":     utls.Hello360_Auto,
	"qq":      utls.HelloQQ_Auto,
	"random":  {},

	// deprecated fingerprints should not be used
	"chrome_psk":                 utls.HelloChrome_100_PSK,
	"chrome_psk_shuffle":         utls.HelloChrome_106_Shuffle,
	"chrome_padding_psk_shuffle": utls.HelloChrome_114_Padding_PSK_Shuf,
	"chrome_pq":                  utls.HelloChrome_115_PQ,
	"chrome_pq_psk":              utls.HelloChrome_115_PQ_PSK,
	"randomized":                 utls.HelloRandomized,
}

func init() {
	weights := utls.DefaultWeights
	weights.TLSVersMax_Set_VersionTLS13 = 1
	weights.FirstKeyShare_Set_CurveP256 = 0
	randomized := utls.HelloRandomized
	randomized.Seed, _ = utls.NewPRNGSeed()
	randomized.Weights = &weights
	fingerprints["randomized"] = randomized
}

type Certificate = utls.Certificate

func UCertificate(it tls.Certificate) utls.Certificate {
	return utls.Certificate{
		Certificate: it.Certificate,
		PrivateKey:  it.PrivateKey,
		SupportedSignatureAlgorithms: utils.Map(it.SupportedSignatureAlgorithms, func(it tls.SignatureScheme) utls.SignatureScheme {
			return utls.SignatureScheme(it)
		}),
		OCSPStaple:                  it.OCSPStaple,
		SignedCertificateTimestamps: it.SignedCertificateTimestamps,
		Leaf:                        it.Leaf,
	}
}

type EncryptedClientHelloKey = utls.EncryptedClientHelloKey

type Config = utls.Config

func UConfig(config *tls.Config) *utls.Config {
	return &utls.Config{
		Rand:                  config.Rand,
		Time:                  config.Time,
		Certificates:          utils.Map(config.Certificates, UCertificate),
		VerifyPeerCertificate: config.VerifyPeerCertificate,
		RootCAs:               config.RootCAs,
		NextProtos:            config.NextProtos,
		ServerName:            config.ServerName,
		ClientAuth:            utls.ClientAuthType(config.ClientAuth),
		ClientCAs:             config.ClientCAs,
		InsecureSkipVerify:    config.InsecureSkipVerify,
		CipherSuites:          config.CipherSuites,
		MinVersion:            config.MinVersion,
		MaxVersion:            config.MaxVersion,
		CurvePreferences: utils.Map(config.CurvePreferences, func(it tls.CurveID) utls.CurveID {
			return utls.CurveID(it)
		}),
		SessionTicketsDisabled: config.SessionTicketsDisabled,
		Renegotiation:          utls.RenegotiationSupport(config.Renegotiation),
	}
}

// BuildWebsocketHandshakeState it will only send http/1.1 in its ALPN.
// Copy from https://github.com/XTLS/Xray-core/blob/main/transport/internet/tls/tls.go
func BuildWebsocketHandshakeState(c *UConn) error {
	// Build the handshake state. This will apply every variable of the TLS of the
	// fingerprint in the UConn
	if err := c.BuildHandshakeState(); err != nil {
		return err
	}
	// Iterate over extensions and check for utls.ALPNExtension
	hasALPNExtension := false
	for _, extension := range c.Extensions {
		if alpn, ok := extension.(*utls.ALPNExtension); ok {
			hasALPNExtension = true
			alpn.AlpnProtocols = []string{"http/1.1"}
			break
		}
	}
	if !hasALPNExtension { // Append extension if doesn't exists
		c.Extensions = append(c.Extensions, &utls.ALPNExtension{AlpnProtocols: []string{"http/1.1"}})
	}
	// Rebuild the client hello
	if err := c.BuildHandshakeState(); err != nil {
		return err
	}
	return nil
}

var globalFingerprint string

func SetGlobalFingerprint(fingerprint string) {
	globalFingerprint = fingerprint
}

func GetGlobalFingerprint() string {
	return globalFingerprint
}
