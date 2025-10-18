"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StreamlinedDisableBlocking;
const api_1 = require("@raycast/api");
const hudHelper_1 = require("./hudHelper");
const statusVerifier_1 = require("./statusVerifier");
const streamlinedHostsManager_1 = require("./streamlinedHostsManager");
async function StreamlinedDisableBlocking() {
    try {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Disable Website Blocking",
            message: "Remove all website blocks and restore access?",
            primaryAction: {
                title: "Disable Blocking",
                style: api_1.Alert.ActionStyle.Default,
            },
            dismissAction: {
                title: "Cancel",
                style: api_1.Alert.ActionStyle.Cancel,
            },
        });
        if (!confirmed) {
            return;
        }
        const loadingToast = await (0, api_1.showToast)({
            style: api_1.Toast.Style.Animated,
            title: "Disabling Website Blocking...",
            message: "Removing all blocks...",
        });
        try {
            const result = await (0, streamlinedHostsManager_1.disableBlocking)();
            if (result.success) {
                await (0, statusVerifier_1.syncBlockingStatus)();
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Success,
                    title: "✅ Website Blocking Disabled",
                    message: "All websites unblocked successfully\n\n🔄 Auto-refreshing open tabs for 5 seconds to restore access immediately!",
                });
                await (0, hudHelper_1.showLongHUD)("🎉 All websites unblocked! Open tabs are being automatically refreshed");
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "Failed to Disable Blocking",
                    message: result.message,
                });
            }
        }
        catch (error) {
            loadingToast.hide();
            if (error.message.includes("Authentication failed") ||
                error.message.includes("canceled")) {
                await (0, hudHelper_1.showLongHUD)("⚠️ Authentication canceled - blocking remains active");
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "Error Disabling Blocking",
                    message: error.message || "An unexpected error occurred",
                });
            }
            console.error("Error disabling blocking:", error);
        }
    }
    catch (error) {
        console.error("Error in StreamlinedDisableBlocking command:", error);
        await (0, api_1.showToast)({
            style: api_1.Toast.Style.Failure,
            title: "Unexpected Error",
            message: "Failed to disable website blocking",
        });
    }
}
//# sourceMappingURL=streamlined-disable-blocking.js.map