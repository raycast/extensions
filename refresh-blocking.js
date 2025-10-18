"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RefreshBlocking;
const api_1 = require("@raycast/api");
const storage_1 = require("./storage");
const hudHelper_1 = require("./hudHelper");
const statusVerifier_1 = require("./statusVerifier");
const browserRefresher_1 = require("./browserRefresher");
const guaranteed100PercentBlocking_1 = require("./guaranteed100PercentBlocking");
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
async function RefreshBlocking() {
    try {
        const blockingStatus = await (0, storage_1.getBlockingStatus)();
        const blockedDomains = await (0, storage_1.getBlockedDomainList)();
        if (blockedDomains.length === 0) {
            await (0, hudHelper_1.showLongHUD)("❌ No websites in your block list. Add some websites first!");
            return;
        }
        const actionText = blockingStatus.isActive
            ? "Re-enable blocking and close blocked tabs?"
            : "Enable blocking and close blocked tabs?";
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Force Re-Block & Fix",
            message: actionText,
            primaryAction: {
                title: "Close Tabs & Enable",
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
            title: "🚫 Closing Tabs & Enabling Blocking...",
            message: "Closing blocked website tabs...",
        });
        try {
            loadingToast.message = "Closing all blocked website tabs...";
            await (0, browserRefresher_1.closeBlockedTabs)(blockedDomains);
            await new Promise((resolve) => setTimeout(resolve, 500));
            loadingToast.message = "Enabling 100% guaranteed blocking (all methods)...";
            loadingToast.message = "Please enter password when prompted";
            const result = await (0, guaranteed100PercentBlocking_1.enable100PercentBlocking)(blockedDomains);
            if (result.success) {
                await (0, statusVerifier_1.syncBlockingStatus)();
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Success,
                    title: "🔥 Force Re-Block Complete!",
                    message: `${result.message}\n\nTabs closed + All blocking methods active!`,
                });
                await (0, hudHelper_1.showLongHUD)("🔥 Force re-block complete! 100% guaranteed blocking active!");
            }
            else {
                throw new Error(result.message);
            }
        }
        catch (error) {
            loadingToast.hide();
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Refresh Error",
                message: error.message || "Failed to refresh blocking",
            });
            console.error("Error refreshing blocking:", error);
        }
    }
    catch (error) {
        console.error("Error in RefreshBlocking command:", error);
        await (0, api_1.showToast)({
            style: api_1.Toast.Style.Failure,
            title: "Unexpected Error",
            message: "Failed to refresh blocking",
        });
    }
}
//# sourceMappingURL=refresh-blocking.js.map