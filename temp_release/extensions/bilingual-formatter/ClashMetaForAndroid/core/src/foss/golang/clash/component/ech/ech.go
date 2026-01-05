package ech

import (
	"context"
	"fmt"

	tlsC "github.com/metacubex/mihomo/component/tls"
)

type Config struct {
	GetEncryptedClientHelloConfigList func(ctx context.Context, serverName string) ([]byte, error)
}

func (cfg *Config) ClientHandle(ctx context.Context, tlsConfig *tlsC.Config) (err error) {
	if cfg == nil {
		return nil
	}
	echConfigList, err := cfg.GetEncryptedClientHelloConfigList(ctx, tlsConfig.ServerName)
	if err != nil {
		return fmt.Errorf("resolve ECH config error: %w", err)
	}

	tlsConfig.EncryptedClientHelloConfigList = echConfigList
	if tlsConfig.MinVersion != 0 && tlsConfig.MinVersion < tlsC.VersionTLS13 {
		tlsConfig.MinVersion = tlsC.VersionTLS13
	}
	if tlsConfig.MaxVersion != 0 && tlsConfig.MaxVersion < tlsC.VersionTLS13 {
		tlsConfig.MaxVersion = tlsC.VersionTLS13
	}
	return nil
}
