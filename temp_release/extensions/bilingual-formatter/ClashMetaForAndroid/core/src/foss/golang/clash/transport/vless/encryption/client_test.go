package encryption

import (
	"fmt"
	"runtime"
	"testing"

	utls "github.com/metacubex/utls"
)

func TestHasAESGCMHardwareSupport(t *testing.T) {
	fmt.Println("HasAESGCMHardwareSupport:", utls.HasAESGCMHardwareSupport())

	if runtime.GOARCH == "arm64" && runtime.GOOS == "darwin" {
		// It should be supported starting from Apple Silicon M1
		// https://github.com/golang/go/blob/go1.25.0/src/internal/cpu/cpu_arm64_darwin.go#L26-L30
		if !utls.HasAESGCMHardwareSupport() {
			t.Errorf("For ARM64 Darwin platforms (excluding iOS), AES GCM hardware acceleration should always be available.")
		}
	}
}
