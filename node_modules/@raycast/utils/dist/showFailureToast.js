"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showFailureToast = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const api_1 = require("@raycast/api");
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
function showFailureToast(error, options) {
    const message = error instanceof Error ? error.message : String(error);
    return (0, api_1.showToast)({
        style: api_1.Toast.Style.Failure,
        title: options?.title ?? "Something went wrong",
        message: options?.message ?? message,
        primaryAction: options?.primaryAction ?? handleErrorToastAction(error),
        secondaryAction: options?.primaryAction ? handleErrorToastAction(error) : undefined,
    });
}
exports.showFailureToast = showFailureToast;
const handleErrorToastAction = (error) => {
    let privateExtension = true;
    let title = "[Extension Name]...";
    let extensionURL = "";
    try {
        const packageJSON = JSON.parse(fs.readFileSync(path.join(api_1.environment.assetsPath, "..", "package.json"), "utf8"));
        title = `[${packageJSON.title}]...`;
        extensionURL = `https://raycast.com/${packageJSON.owner || packageJSON.author}/${packageJSON.name}`;
        if (!packageJSON.owner || packageJSON.access === "public") {
            privateExtension = false;
        }
    }
    catch (err) {
        // no-op
    }
    // if it's a private extension, we can't construct the URL to report the error
    // so we fallback to copying the error to the clipboard
    const fallback = api_1.environment.isDevelopment || privateExtension;
    const stack = error instanceof Error ? error?.stack || error?.message || "" : String(error);
    return {
        title: fallback ? "Copy Logs" : "Report Error",
        onAction(toast) {
            toast.hide();
            if (fallback) {
                api_1.Clipboard.copy(stack);
            }
            else {
                (0, api_1.open)(`https://github.com/raycast/extensions/issues/new?&labels=extension%2Cbug&template=extension_bug_report.yml&title=${encodeURIComponent(title)}&extension-url=${encodeURI(extensionURL)}&description=${encodeURIComponent(`#### Error:
\`\`\`
${stack}
\`\`\`
`)}`);
            }
        },
    };
};
