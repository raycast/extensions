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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ViewBlockedSites;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const api_1 = require("@raycast/api");
const storage_1 = require("./storage");
const domainUtils_1 = require("./domainUtils");
const statusVerifier_1 = require("./statusVerifier");
const add_website_1 = __importDefault(require("./add-website"));
const api_2 = require("@raycast/api");
const promises_1 = require("fs/promises");
const path_1 = require("path");
function ViewBlockedSites() {
    const [domains, setDomains] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [isBlockingActive, setIsBlockingActive] = (0, react_1.useState)(false);
    const [selectedDomains, setSelectedDomains] = (0, react_1.useState)(new Set());
    const [categoryFilter, setCategoryFilter] = (0, react_1.useState)("all");
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [tempUnblockExpiry, setTempUnblockExpiry] = (0, react_1.useState)();
    (0, react_1.useEffect)(() => {
        async function loadData() {
            try {
                const actualStatus = await (0, statusVerifier_1.syncBlockingStatus)();
                const [blockedDomains, cats, tempUnblock] = await Promise.all([
                    (0, storage_1.getBlockedDomains)(),
                    (0, storage_1.getCategories)(),
                    (0, storage_1.getTemporaryUnblock)(),
                ]);
                setDomains(blockedDomains);
                setCategories(cats);
                setIsBlockingActive(actualStatus);
                setTempUnblockExpiry(tempUnblock.expiresAt);
                console.log(`✅ Loaded ${blockedDomains.length} domains. Blocking is ${actualStatus ? "ACTIVE" : "INACTIVE"} (verified from hosts file)`);
            }
            catch (error) {
                console.error("Error loading blocked sites:", error);
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "Failed to Load",
                    message: "Could not load blocked sites list",
                });
            }
            finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);
    async function handleToggleDomain(domain, currentStatus) {
        try {
            const newStatus = await (0, storage_1.toggleDomainEnabled)(domain);
            setDomains((prevDomains) => prevDomains.map((d) => d.domain === domain ? { ...d, isEnabled: newStatus } : d));
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: newStatus ? "Domain Enabled" : "Domain Disabled",
                message: `${domain} is now ${newStatus ? "enabled" : "disabled"} for blocking`,
            });
        }
        catch (error) {
            console.error("Error toggling domain:", error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Failed to Toggle",
                message: error.message || "Could not toggle domain status",
            });
        }
    }
    async function handleDeleteDomain(domain) {
        const confirmed = await (0, api_1.confirmAlert)({
            title: "Remove Website",
            message: `Are you sure you want to remove "${domain}" from your block list?`,
            primaryAction: {
                title: "Remove",
                style: api_1.Alert.ActionStyle.Destructive,
            },
            dismissAction: {
                title: "Cancel",
                style: api_1.Alert.ActionStyle.Cancel,
            },
        });
        if (!confirmed) {
            return;
        }
        try {
            const success = await (0, storage_1.removeBlockedDomain)(domain);
            if (success) {
                setDomains((prevDomains) => prevDomains.filter((d) => d.domain !== domain));
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Success,
                    title: "Website Removed",
                    message: `${domain} has been removed from your block list`,
                });
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "Not Found",
                    message: `${domain} was not found in your block list`,
                });
            }
        }
        catch (error) {
            console.error("Error removing domain:", error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Failed to Remove",
                message: error.message || "Could not remove website from block list",
            });
        }
    }
    async function handleBulkDelete() {
        if (selectedDomains.size === 0)
            return;
        const confirmed = await (0, api_1.confirmAlert)({
            title: `Remove ${selectedDomains.size} Website${selectedDomains.size > 1 ? "s" : ""}`,
            message: `Are you sure you want to remove ${selectedDomains.size} website${selectedDomains.size > 1 ? "s" : ""} from your block list?`,
            primaryAction: {
                title: "Remove",
                style: api_1.Alert.ActionStyle.Destructive,
            },
        });
        if (!confirmed)
            return;
        try {
            const count = await (0, storage_1.bulkDeleteDomains)(Array.from(selectedDomains));
            setDomains((prev) => prev.filter((d) => !selectedDomains.has(d.domain)));
            setSelectedDomains(new Set());
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Websites Removed",
                message: `${count} website${count > 1 ? "s" : ""} removed`,
            });
        }
        catch (error) {
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Failed",
                message: error.message,
            });
        }
    }
    async function handleBulkToggle(enable) {
        if (selectedDomains.size === 0)
            return;
        try {
            const count = await (0, storage_1.bulkToggleDomains)(Array.from(selectedDomains), enable);
            setDomains((prev) => prev.map((d) => selectedDomains.has(d.domain) ? { ...d, isEnabled: enable } : d));
            setSelectedDomains(new Set());
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: `Domains ${enable ? "Enabled" : "Disabled"}`,
                message: `${count} domain${count > 1 ? "s" : ""} updated`,
            });
        }
        catch (error) {
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Failed",
                message: error.message,
            });
        }
    }
    async function handleBulkAssignCategory(categoryName) {
        if (selectedDomains.size === 0)
            return;
        try {
            const count = await (0, storage_1.bulkAssignCategories)(Array.from(selectedDomains), [
                categoryName,
            ]);
            const updatedDomains = await (0, storage_1.getBlockedDomains)();
            setDomains(updatedDomains);
            setSelectedDomains(new Set());
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Category Assigned",
                message: `${count} domain${count > 1 ? "s" : ""} updated`,
            });
        }
        catch (error) {
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Failed",
                message: error.message,
            });
        }
    }
    function toggleSelection(domain) {
        setSelectedDomains((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(domain)) {
                newSet.delete(domain);
            }
            else {
                newSet.add(domain);
            }
            return newSet;
        });
    }
    function getFilteredDomains() {
        if (categoryFilter === "all")
            return domains;
        if (categoryFilter === "uncategorized") {
            return domains.filter((d) => !d.categories || d.categories.length === 0);
        }
        return domains.filter((d) => d.categories?.includes(categoryFilter));
    }
    async function handleExport() {
        try {
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Animated,
                title: "Exporting...",
            });
            const jsonData = await (0, storage_1.exportData)();
            const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-")
                .split("T")[0];
            const filename = `webblocker-export-${timestamp}.json`;
            const homedir = process.env.HOME || process.env.USERPROFILE || "~";
            const downloadsPath = (0, path_1.join)(homedir, "Downloads");
            const filepath = (0, path_1.join)(downloadsPath, filename);
            await (0, promises_1.writeFile)(filepath, jsonData, "utf-8");
            await api_2.Clipboard.copy(jsonData);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Exported Successfully",
                message: `Saved to Downloads/${filename} and copied to clipboard`,
            });
        }
        catch (error) {
            console.error("Export error:", error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Export Failed",
                message: error.message,
            });
        }
    }
    async function handleImport() {
        try {
            const clipboardText = await api_2.Clipboard.readText();
            if (!clipboardText) {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "No Data",
                    message: "Clipboard is empty. Copy JSON data first.",
                });
                return;
            }
            try {
                JSON.parse(clipboardText);
            }
            catch (parseError) {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "Invalid JSON",
                    message: "Clipboard does not contain valid JSON data. Please export first and copy the data.",
                });
                return;
            }
            const confirmed = await (0, api_1.confirmAlert)({
                title: "Import Block List",
                message: "This will merge the imported data with your existing block list. Continue?",
                primaryAction: {
                    title: "Import",
                    style: api_1.Alert.ActionStyle.Default,
                },
            });
            if (!confirmed)
                return;
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Animated,
                title: "Importing...",
            });
            await (0, storage_1.importData)(clipboardText, true);
            const [updatedDomains, updatedCategories] = await Promise.all([
                (0, storage_1.getBlockedDomains)(),
                (0, storage_1.getCategories)(),
            ]);
            setDomains(updatedDomains);
            setCategories(updatedCategories);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Imported Successfully",
                message: "Block list has been updated",
            });
        }
        catch (error) {
            console.error("Import error:", error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Import Failed",
                message: error.message || "Invalid JSON data",
            });
        }
    }
    async function handleImportFromFile() {
        try {
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Animated,
                title: "Opening File Picker...",
            });
            const homedir = process.env.HOME || process.env.USERPROFILE || "~";
            const downloadsPath = (0, path_1.join)(homedir, "Downloads");
            const { execSync } = await Promise.resolve().then(() => __importStar(require("child_process")));
            const script = `osascript -e 'POSIX path of (choose file with prompt "Select WebBlocker export JSON file" of type {"public.json"} default location "${downloadsPath}")'`;
            let filePath;
            try {
                filePath = execSync(script, { encoding: "utf-8" }).trim();
            }
            catch (error) {
                return;
            }
            if (!filePath)
                return;
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Animated,
                title: "Reading file...",
            });
            const fileContent = await (0, promises_1.readFile)(filePath, "utf-8");
            try {
                JSON.parse(fileContent);
            }
            catch (parseError) {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: "Invalid JSON",
                    message: "The selected file does not contain valid JSON data.",
                });
                return;
            }
            const confirmed = await (0, api_1.confirmAlert)({
                title: "Import Block List",
                message: "This will merge the imported data with your existing block list. Continue?",
                primaryAction: {
                    title: "Import",
                    style: api_1.Alert.ActionStyle.Default,
                },
            });
            if (!confirmed)
                return;
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Animated,
                title: "Importing...",
            });
            await (0, storage_1.importData)(fileContent, true);
            const [updatedDomains, updatedCategories] = await Promise.all([
                (0, storage_1.getBlockedDomains)(),
                (0, storage_1.getCategories)(),
            ]);
            setDomains(updatedDomains);
            setCategories(updatedCategories);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Imported Successfully",
                message: "Block list has been updated",
            });
        }
        catch (error) {
            console.error("Import from file error:", error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Import Failed",
                message: error.message || "Could not import file",
            });
        }
    }
    function formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        }
        catch {
            return "Unknown date";
        }
    }
    if (!isLoading && domains.length === 0) {
        return ((0, jsx_runtime_1.jsx)(api_1.List, { children: (0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: "No Blocked Websites", description: "You haven't added any websites to your block list yet.", actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add Website", target: (0, jsx_runtime_1.jsx)(add_website_1.default, {}), icon: api_1.Icon.Plus }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Import from File", icon: api_1.Icon.Finder, onAction: handleImportFromFile }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Import from Clipboard", icon: api_1.Icon.Upload, onAction: handleImport })] }) }) }));
    }
    const filteredDomains = getFilteredDomains();
    const statusText = tempUnblockExpiry
        ? `⏱️ Temporarily unblocked (${domains.length} domains)`
        : isBlockingActive
            ? `🚫 ${domains.length} websites blocked`
            : `✅ ${domains.length} websites ready`;
    return ((0, jsx_runtime_1.jsxs)(api_1.List, { isLoading: isLoading, searchBarAccessory: (0, jsx_runtime_1.jsxs)(api_1.List.Dropdown, { tooltip: "Filter by Category", value: categoryFilter, onChange: setCategoryFilter, children: [(0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Item, { title: "All Categories", value: "all" }), (0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Item, { title: "Uncategorized", value: "uncategorized" }), (0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Section, { title: "Categories", children: categories.map((cat) => ((0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Item, { title: cat.name, value: cat.name }, cat.name))) })] }), children: [selectedDomains.size > 0 && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: `${selectedDomains.size} Selected`, children: (0, jsx_runtime_1.jsx)(api_1.List.Item, { title: "Bulk Actions", icon: api_1.Icon.CheckCircle, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Bulk Actions", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Enable Selected", icon: api_1.Icon.CheckCircle, onAction: () => handleBulkToggle(true) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Disable Selected", icon: api_1.Icon.XMarkCircle, onAction: () => handleBulkToggle(false) }), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Submenu, { title: "Assign Category", icon: api_1.Icon.Tag, children: categories.map((cat) => ((0, jsx_runtime_1.jsx)(api_1.Action, { title: cat.name, onAction: () => handleBulkAssignCategory(cat.name) }, cat.name))) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Delete Selected", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, onAction: handleBulkDelete }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Clear Selection", icon: api_1.Icon.XMarkCircle, onAction: () => setSelectedDomains(new Set()) })] }) }) }) })), (0, jsx_runtime_1.jsx)(api_1.List.Section, { title: `Blocked Websites (${filteredDomains.length}${categoryFilter !== "all" ? ` filtered` : ""})`, children: filteredDomains.map((blockedDomain) => ((0, jsx_runtime_1.jsx)(api_1.List.Item, { icon: {
                        source: selectedDomains.has(blockedDomain.domain)
                            ? api_1.Icon.CheckCircle
                            : blockedDomain.isEnabled
                                ? api_1.Icon.Circle
                                : api_1.Icon.CircleProgress,
                        tintColor: selectedDomains.has(blockedDomain.domain)
                            ? api_1.Color.Blue
                            : blockedDomain.isEnabled
                                ? api_1.Color.Green
                                : api_1.Color.SecondaryText,
                    }, title: (0, domainUtils_1.formatDomainForDisplay)(blockedDomain.domain), subtitle: blockedDomain.notes || undefined, accessories: [
                        ...(blockedDomain.categories &&
                            blockedDomain.categories.length > 0
                            ? [
                                {
                                    tag: {
                                        value: blockedDomain.categories[0],
                                        color: api_1.Color.Blue,
                                    },
                                    tooltip: blockedDomain.categories.join(", "),
                                },
                            ]
                            : []),
                        {
                            text: formatDate(blockedDomain.dateAdded),
                            icon: api_1.Icon.Calendar,
                        },
                    ], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Actions", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: selectedDomains.has(blockedDomain.domain)
                                            ? "Deselect"
                                            : "Select", icon: selectedDomains.has(blockedDomain.domain)
                                            ? api_1.Icon.XMarkCircle
                                            : api_1.Icon.CheckCircle, shortcut: { modifiers: ["cmd"], key: "s" }, onAction: () => toggleSelection(blockedDomain.domain) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: blockedDomain.isEnabled
                                            ? "Disable Domain"
                                            : "Enable Domain", icon: blockedDomain.isEnabled
                                            ? api_1.Icon.XMarkCircle
                                            : api_1.Icon.CheckCircle, shortcut: { modifiers: ["cmd"], key: "t" }, onAction: () => handleToggleDomain(blockedDomain.domain, blockedDomain.isEnabled) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Remove Website", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["cmd"], key: "backspace" }, onAction: () => handleDeleteDomain(blockedDomain.domain) }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { title: "Copy Domain", content: blockedDomain.domain, icon: api_1.Icon.Clipboard })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Manage", children: [(0, jsx_runtime_1.jsx)(api_1.Action.Push, { title: "Add Website", target: (0, jsx_runtime_1.jsx)(add_website_1.default, {}), icon: api_1.Icon.Plus }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Export Block List", icon: api_1.Icon.Download, onAction: handleExport, shortcut: { modifiers: ["cmd", "shift"], key: "e" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Import from File", icon: api_1.Icon.Finder, onAction: handleImportFromFile, shortcut: { modifiers: ["cmd", "shift"], key: "o" } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Import from Clipboard", icon: api_1.Icon.Upload, onAction: handleImport, shortcut: { modifiers: ["cmd", "shift"], key: "i" } })] })] }) }, blockedDomain.domain))) })] }));
}
//# sourceMappingURL=view-blocked-sites.js.map