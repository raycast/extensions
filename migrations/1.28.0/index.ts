import { API, FileInfo } from "jscodeshift";

import ClipboardTransform from "./clipboard";
import StorageTransform from "./storage";
import KeyboardTransform from "./keyboard";
import ActionTransform from "./action";
import ActionPanelTransform from "./action-panel";
import AlertTransform from "./alert";
import DetailTransform from "./detail";
import FormTransform from "./form";
import ListTransform from "./list";
import ToastTransform from "./toast";
import ColorTransform from "./color";
import ImageTransform from "./image";

export default function CompleteTransform(file: FileInfo, api: API) {
  const j = api.jscodeshift;
  const root = j(file.source);

  [
    ActionPanelTransform,
    ActionTransform,
    AlertTransform,
    ClipboardTransform,
    ColorTransform,
    DetailTransform,
    FormTransform,
    ImageTransform,
    KeyboardTransform,
    ListTransform,
    StorageTransform,
    ToastTransform,
  ].forEach((transform) => {
    transform(j, root);
  });

  return root.toSource();
}
