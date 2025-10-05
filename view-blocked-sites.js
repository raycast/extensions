"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ViewBlockedSites;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const api_1 = require("@raycast/api");
const storage_1 = require("./lib/storage");
const domainUtils_1 = require("./lib/domainUtils");
const add_website_1 = __importDefault(require("./add-website"));
function ViewBlockedSites() {
    const [domains, setDomains] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isBlockingActive, setIsBlockingActive] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        async function loadData() {
            try {
                const [blockedDomains, blockingStatus] = await Promise.all([
                    (0, storage_1.getBlockedDomains)(),
                    (0, storage_1.getBlockingStatus)()
                ]);
                setDomains(blockedDomains);
                setIsBlockingActive(blockingStatus.isActive);
            }
            catch (error) {
                console.error('Error loading blocked sites:', error);
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: 'Failed to Load',
                    message: 'Could not load blocked sites list'
                });
            }
            finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);
    async function handleDeleteDomain(domain) {
        const confirmed = await (0, api_1.confirmAlert)({
            title: 'Remove Website',
            message: `Are you sure you want to remove "${domain}" from your block list?`,
            primaryAction: {
                title: 'Remove',
                style: api_1.Alert.ActionStyle.Destructive
            },
            dismissAction: {
                title: 'Cancel',
                style: api_1.Alert.ActionStyle.Cancel
            }
        });
        if (!confirmed) {
            return;
        }
        try {
            const success = await (0, storage_1.removeBlockedDomain)(domain);
            if (success) {
                setDomains(prevDomains => prevDomains.filter(d => d.domain !== domain));
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Success,
                    title: 'Website Removed',
                    message: `${domain} has been removed from your block list`
                });
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: 'Not Found',
                    message: `${domain} was not found in your block list`
                });
            }
        }
        catch (error) {
            console.error('Error removing domain:', error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: 'Failed to Remove',
                message: error.message || 'Could not remove website from block list'
            });
        }
    }
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
        catch {
            return 'Unknown date';
        }
    }
    if (!isLoading && domains.length === 0) {
        return ((0, jsx_runtime_1.jsx)(api_1.List, { children: (0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No Blocked Websites", description: "You haven't added any websites to your block list yet.", actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add Website", target: (0, jsx_runtime_1.jsx)(add_website_1.default, {}), icon: api_1.Icon.Plus }) }) }) }));
    }
    return ((0, jsx_runtime_1.jsxs)(api_1.List, { isLoading: isLoading, children: [(0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Status", children: (0, jsx_runtime_1.jsx)(api_1.List.Item, { title: isBlockingActive ? "🚫 Blocking is ACTIVE" : "✅ Blocking is INACTIVE", subtitle: isBlockingActive
                        ? `${domains.length} website(s) are currently blocked`
                        : `${domains.length} website(s) in your list (not currently blocking)`, accessories: [
                        {
                            text: isBlockingActive ? "Active" : "Inactive",
                            icon: isBlockingActive ? api_1.Icon.CheckCircle : api_1.Icon.XMarkCircle
                        }
                    ], actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add Website", target: (0, jsx_runtime_1.jsx)(add_website_1.default, {}), icon: api_1.Icon.Plus }) }) }) }), (0, jsx_runtime_1.jsx)(api_1.List.Section, { title: `Blocked Websites (${domains.length})`, children: domains.map((blockedDomain) => ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: (0, domainUtils_1.formatDomainForDisplay)(blockedDomain.domain), subtitle: blockedDomain.notes || 'No notes', accessories: [
                        {
                            text: formatDate(blockedDomain.dateAdded),
                            icon: api_1.Icon.Calendar
                        }
                    ], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Actions", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Remove Website", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["cmd"], key: "backspace" }, onAction: () => handleDeleteDomain(blockedDomain.domain) }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Domain", content: blockedDomain.domain, icon: api_1.Icon.Clipboard })] }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Manage", children: (0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add Website", target: (0, jsx_runtime_1.jsx)(add_website_1.default, {}), icon: api_1.Icon.Plus }) })] }) }, blockedDomain.domain))) })] }));
}
//# sourceMappingURL=view-blocked-sites.js.map