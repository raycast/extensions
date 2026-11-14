import { captureRaw, RawCaptureParams } from "./raw-capture.js";

export type TodoCaptureParams = Omit<RawCaptureParams, "type">;
export function captureTodo(params: TodoCaptureParams) {
  return captureRaw({ ...params, type: "todo" });
}
