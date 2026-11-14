import { captureRaw, RawCaptureParams } from "./raw-capture.js";

export type NoteCaptureParams = Omit<RawCaptureParams, "type"> & {
  type: "note";
};
export function captureNote(params: NoteCaptureParams) {
  return captureRaw(params);
}
