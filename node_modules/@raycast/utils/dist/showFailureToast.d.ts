import { Toast } from "@raycast/api";
/**
 * Shows a failure Toast for a given Error.
 *
 * @example
 * ```typescript
 * import { showHUD } from "@raycast/api";
 * import { runAppleScript, showFailureToast } from "@raycast/utils";
 *
 * export default async function () {
 *   try {
 *     const res = await runAppleScript(
 *       `
 *       on run argv
 *         return "hello, " & item 1 of argv & "."
 *       end run
 *       `,
 *       ["world"]
 *     );
 *     await showHUD(res);
 *   } catch (error) {
 *     showFailureToast(error, { title: "Could not run AppleScript" });
 *   }
 * }
 * ```
 */
export declare function showFailureToast(error: unknown, options?: Partial<Pick<Toast.Options, "title" | "primaryAction" | "message">>): Promise<Toast>;
//# sourceMappingURL=showFailureToast.d.ts.map