package gun

import (
	"context"
	"net"
	"sync"

	"golang.org/x/net/http2"
)

type TransportWrap struct {
	*http2.Transport
	ctx       context.Context
	cancel    context.CancelFunc
	closeOnce sync.Once
}

func (tw *TransportWrap) Close() error {
	tw.closeOnce.Do(func() {
		tw.cancel()
		closeTransport(tw.Transport)
	})
	return nil
}

type netAddr struct {
	remoteAddr net.Addr
	localAddr  net.Addr
}

func (addr netAddr) RemoteAddr() net.Addr {
	return addr.remoteAddr
}

func (addr netAddr) LocalAddr() net.Addr {
	return addr.localAddr
}
