import * as React from "react";

// Relax JSX element typing to accommodate Raycast UI components in this
// workspace without per-file `as any` casts. This intentionally narrows
// only the IntrinsicElements mapping so JSX usage is accepted.
declare global {
  namespace JSX {
    // Allow arbitrary component tags/props to reduce friction while types are
    // aligned across the workspace. This is a pragmatic local shim.
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

export {};
