package buf

import (
	"github.com/metacubex/sing/common"
	"github.com/metacubex/sing/common/buf"
)

const BufferSize = buf.BufferSize

type Buffer = buf.Buffer

var New = buf.New
var NewPacket = buf.NewPacket
var NewSize = buf.NewSize
var With = buf.With
var As = buf.As
var ReleaseMulti = buf.ReleaseMulti

var (
	Must  = common.Must
	Error = common.Error
)
