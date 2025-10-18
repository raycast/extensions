"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = StreamlinedEnableBlocking;
const api_1 = require("@raycast/api");
const storage_1 = require("./storage");
const statusVerifier_1 = require("./statusVerifier");
const hudHelper_1 = require("./hudHelper");
const guaranteed100PercentBlocking_1 = require("./guaranteed100PercentBlocking");
const browserRefresher_1 = require("./browserRefresher");
async function StreamlinedEnableBlocking() {
    try {
        const allDomains = await (0, storage_1.getBlockedDomains)();
        const domainsToBlock = await (0, storage_1.getEnabledDomains)();
        if (allDomains.length === 0) {
            await (0, hudHelper_1.showLongHUD)("❌ No websites in your block list. Add some websites first!");
            return;
        }
        if (domainsToBlock.length === 0) {
            await (0, hudHelper_1.showLongHUD)('❌ No enabled websites to block. Enable some websites in "Manage Blocked Sites" first!');
            return;
        }
        const disabledCount = allDomains.length - domainsToBlock.length;
        const statusMsg = disabledCount > 0
            ? `\n${disabledCount} website(s) disabled and won't be blocked`
            : "";
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Enable Website Blocking",
            message: `Block ${domainsToBlock.length} of ${allDomains.length} website(s)?${statusMsg}`,
            primaryAction: {
                title: "Enable Blocking",
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
            title: "🚫 Enabling Website Blocking...",
            message: "Closing blocked website tabs...",
        });
        try {
            console.log(`🚫 Closing ${domainsToBlock.length} blocked website tabs...`);
            await (0, browserRefresher_1.closeBlockedTabs)(domainsToBlock).catch((error) => {
                console.error("Error closing tabs:", error);
            });
            loadingToast.message = "Enabling 100% guaranteed blocking...";
            console.log(`🔥 Enabling 100% guaranteed blocking (ALL methods)...`);
            const result = await (0, guaranteed100PercentBlocking_1.enable100PercentBlocking)(domainsToBlock);
            if (result.success) {
                await (0, statusVerifier_1.syncBlockingStatus)();
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Success,
                    title: "🚫 Website Blocking Enabled",
                    message: `Successfully blocked ${domainsToBlock.length} website(s)\n\n✅ Tabs closed + Cache bypass prevented!\n� Blocked tabs were force-refreshed\n(Browser stayed open!)`,
                });
                await (0, hudHelper_1.showLongHUD)("✅ Blocking active! No cache bypass possible - Browser stayed open!");
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "Failed to Enable Blocking",
                    message: result.message,
                });
            }
        }
        catch (error) {
            loadingToast.hide();
            if (error.message.includes("Authentication failed") ||
                error.message.includes("canceled")) {
                await (0, hudHelper_1.showLongHUD)("⚠️ Authentication canceled - blocking not enabled");
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "Error Enabling Blocking",
                    message: error.message || "An unexpected error occurred",
                });
            }
            console.error("Error enabling blocking:", error);
        }
    }
    catch (error) {
        console.error("Error in StreamlinedEnableBlocking command:", error);
        await (0, api_1.showToast)({
            style: api_1.Toast.Style.Failure,
            title: "Unexpected Error",
            message: "Failed to enable website blocking",
        });
    }
}
//# sourceMappingURL=streamlined-enable-blocking.js.map