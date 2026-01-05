package ca

import (
	"crypto"
	"crypto/ecdsa"
	"crypto/ed25519"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"encoding/pem"
	"fmt"
	"math/big"
	"os"
	"time"
)

type Path interface {
	Resolve(path string) string
	IsSafePath(path string) bool
	ErrNotSafePath(path string) error
}

// LoadTLSKeyPair loads a TLS key pair from the provided certificate and private key data or file paths, supporting fallback resolution.
// Returns a tls.Certificate and an error, where the error indicates issues during parsing or file loading.
// If both certificate and privateKey are empty, generates a random TLS RSA key pair.
// Accepts a Path interface for resolving file paths when necessary.
func LoadTLSKeyPair(certificate, privateKey string, path Path) (tls.Certificate, error) {
	if certificate == "" && privateKey == "" {
		var err error
		certificate, privateKey, _, err = NewRandomTLSKeyPair(KeyPairTypeRSA)
		if err != nil {
			return tls.Certificate{}, err
		}
	}
	cert, painTextErr := tls.X509KeyPair([]byte(certificate), []byte(privateKey))
	if painTextErr == nil {
		return cert, nil
	}
	if path == nil {
		return tls.Certificate{}, painTextErr
	}

	certificate = path.Resolve(certificate)
	privateKey = path.Resolve(privateKey)
	var loadErr error
	if !path.IsSafePath(certificate) {
		loadErr = path.ErrNotSafePath(certificate)
	} else if !path.IsSafePath(privateKey) {
		loadErr = path.ErrNotSafePath(privateKey)
	} else {
		cert, loadErr = tls.LoadX509KeyPair(certificate, privateKey)
	}
	if loadErr != nil {
		return tls.Certificate{}, fmt.Errorf("parse certificate failed, maybe format error:%s, or path error: %s", painTextErr.Error(), loadErr.Error())
	}
	return cert, nil
}

func LoadCertificates(certificate string, path Path) (*x509.CertPool, error) {
	pool := x509.NewCertPool()
	if pool.AppendCertsFromPEM([]byte(certificate)) {
		return pool, nil
	}
	painTextErr := fmt.Errorf("invalid certificate: %s", certificate)
	if path == nil {
		return nil, painTextErr
	}

	certificate = path.Resolve(certificate)
	var loadErr error
	if !path.IsSafePath(certificate) {
		loadErr = path.ErrNotSafePath(certificate)
	} else {
		certPEMBlock, err := os.ReadFile(certificate)
		if pool.AppendCertsFromPEM(certPEMBlock) {
			return pool, nil
		}
		loadErr = err
	}
	if loadErr != nil {
		return nil, fmt.Errorf("parse certificate failed, maybe format error:%s, or path error: %s", painTextErr.Error(), loadErr.Error())
	}
	return pool, nil
}

type KeyPairType string

const (
	KeyPairTypeRSA     KeyPairType = "rsa"
	KeyPairTypeP256    KeyPairType = "p256"
	KeyPairTypeP384    KeyPairType = "p384"
	KeyPairTypeEd25519 KeyPairType = "ed25519"
)

// NewRandomTLSKeyPair generates a random TLS key pair based on the specified KeyPairType and returns it with a SHA256 fingerprint.
// Note: Most browsers do not support KeyPairTypeEd25519 type of certificate, and utls.UConn will also reject this type of certificate.
func NewRandomTLSKeyPair(keyPairType KeyPairType) (certificate string, privateKey string, fingerprint string, err error) {
	var key crypto.Signer
	switch keyPairType {
	case KeyPairTypeRSA:
		key, err = rsa.GenerateKey(rand.Reader, 2048)
	case KeyPairTypeP256:
		key, err = ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	case KeyPairTypeP384:
		key, err = ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	case KeyPairTypeEd25519:
		_, key, err = ed25519.GenerateKey(rand.Reader)
	default: // fallback to KeyPairTypeRSA
		key, err = rsa.GenerateKey(rand.Reader, 2048)
	}
	if err != nil {
		return
	}

	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		NotBefore:    time.Now().Add(-time.Hour * 24 * 365),
		NotAfter:     time.Now().Add(time.Hour * 24 * 365),
	}
	certDER, err := x509.CreateCertificate(rand.Reader, &template, &template, key.Public(), key)
	if err != nil {
		return
	}
	privBytes, err := x509.MarshalPKCS8PrivateKey(key)
	if err != nil {
		return
	}
	fingerprint = CalculateFingerprint(certDER)
	privateKey = string(pem.EncodeToMemory(&pem.Block{Type: "PRIVATE KEY", Bytes: privBytes}))
	certificate = string(pem.EncodeToMemory(&pem.Block{Type: "CERTIFICATE", Bytes: certDER}))
	return
}
