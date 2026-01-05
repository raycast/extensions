package vmess

import (
	"context"
	"crypto/tls"
	"errors"
	"net"

	"github.com/metacubex/mihomo/component/ca"
	"github.com/metacubex/mihomo/component/ech"
	tlsC "github.com/metacubex/mihomo/component/tls"
)

type TLSConfig struct {
	Host              string
	SkipCertVerify    bool
	FingerPrint       string
	Certificate       string
	PrivateKey        string
	ClientFingerprint string
	NextProtos        []string
	ECH               *ech.Config
	Reality           *tlsC.RealityConfig
}

type ECHConfig struct {
	Enable bool
}

func StreamTLSConn(ctx context.Context, conn net.Conn, cfg *TLSConfig) (net.Conn, error) {
	tlsConfig, err := ca.GetTLSConfig(ca.Option{
		TLSConfig: &tls.Config{
			ServerName:         cfg.Host,
			InsecureSkipVerify: cfg.SkipCertVerify,
			NextProtos:         cfg.NextProtos,
		},
		Fingerprint: cfg.FingerPrint,
		Certificate: cfg.Certificate,
		PrivateKey:  cfg.PrivateKey,
	})
	if err != nil {
		return nil, err
	}

	if clientFingerprint, ok := tlsC.GetFingerprint(cfg.ClientFingerprint); ok {
		tlsConfig := tlsC.UConfig(tlsConfig)
		err = cfg.ECH.ClientHandle(ctx, tlsConfig)
		if err != nil {
			return nil, err
		}

		if cfg.Reality == nil {
			tlsConn := tlsC.UClient(conn, tlsConfig, clientFingerprint)
			err = tlsConn.HandshakeContext(ctx)
			if err != nil {
				return nil, err
			}
			return tlsConn, nil
		} else {
			return tlsC.GetRealityConn(ctx, conn, clientFingerprint, tlsConfig, cfg.Reality)
		}
	}
	if cfg.Reality != nil {
		return nil, errors.New("REALITY is based on uTLS, please set a client-fingerprint")
	}

	if cfg.ECH != nil {
		tlsConfig := tlsC.UConfig(tlsConfig)
		err = cfg.ECH.ClientHandle(ctx, tlsConfig)
		if err != nil {
			return nil, err
		}

		tlsConn := tlsC.Client(conn, tlsConfig)

		err = tlsConn.HandshakeContext(ctx)
		return tlsConn, err
	}

	tlsConn := tls.Client(conn, tlsConfig)

	err = tlsConn.HandshakeContext(ctx)
	return tlsConn, err
}
