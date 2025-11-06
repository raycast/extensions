// Local minimal type augmentations for @raycast/api to align JSX component types
// with the project's React typings. This prevents CI type errors caused by
// mismatched declaration shapes in different versions of @raycast/api.
import * as React from "react";

declare module "@raycast/api" {
  // Generic component shape used for Raycast UI components in this file.
  export type RaycastComponent<P = any> = React.FC<P>;

  export const List: RaycastComponent<any> & {
    Section: RaycastComponent<any>;
    Item: RaycastComponent<any> & { Accessory?: any };
    EmptyView: RaycastComponent<any>;
  };

  export const Action: RaycastComponent<any> & {
    Paste: RaycastComponent<any>;
    CopyToClipboard: RaycastComponent<any>;
    OpenInBrowser: RaycastComponent<any>;
  };

  export const ActionPanel: RaycastComponent<any>;

  export const Icon: any;

  export const Clipboard: {
    copy: (text: string) => Promise<void>;
  };

  export function open(url: string): Promise<void>;

  export function showToast(options: any): Promise<void>;

  export const Toast: any;
}
