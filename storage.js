"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedDomains = getBlockedDomains;
exports.saveBlockedDomains = saveBlockedDomains;
exports.addBlockedDomain = addBlockedDomain;
exports.removeBlockedDomain = removeBlockedDomain;
exports.getBlockingStatus = getBlockingStatus;
exports.setBlockingStatus = setBlockingStatus;
exports.getBlockedDomainList = getBlockedDomainList;
exports.toggleDomainEnabled = toggleDomainEnabled;
exports.getEnabledDomains = getEnabledDomains;
exports.clearAllBlockedDomains = clearAllBlockedDomains;
exports.getTemporaryUnblock = getTemporaryUnblock;
exports.setTemporaryUnblock = setTemporaryUnblock;
exports.clearTemporaryUnblock = clearTemporaryUnblock;
exports.isTemporarilyUnblocked = isTemporarilyUnblocked;
exports.getCategories = getCategories;
exports.saveCategories = saveCategories;
exports.addCategory = addCategory;
exports.getDomainsByCategory = getDomainsByCategory;
exports.bulkDeleteDomains = bulkDeleteDomains;
exports.bulkToggleDomains = bulkToggleDomains;
exports.bulkAssignCategories = bulkAssignCategories;
exports.getSettings = getSettings;
exports.saveSettings = saveSettings;
exports.exportData = exportData;
exports.importData = importData;
const api_1 = require("@raycast/api");
const BLOCKED_DOMAINS_KEY = "blocked-domains";
const BLOCKING_STATUS_KEY = "blocking-status";
const TEMPORARY_UNBLOCK_KEY = "temporary-unblock";
const CATEGORIES_KEY = "categories";
const SETTINGS_KEY = "settings";
async function getBlockedDomains() {
    try {
        const storedData = await api_1.LocalStorage.getItem(BLOCKED_DOMAINS_KEY);
        if (!storedData) {
            return [];
        }
        const parsed = JSON.parse(storedData);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed.map((item) => ({
            domain: item.domain || "",
            dateAdded: item.dateAdded || new Date().toISOString(),
            notes: item.notes || undefined,
            isEnabled: item.isEnabled !== undefined ? item.isEnabled : true,
            categories: item.categories || [],
        }));
    }
    catch (error) {
        console.error("Error reading blocked domains from storage:", error);
        return [];
    }
}
async function saveBlockedDomains(domains) {
    try {
        const dataToStore = JSON.stringify(domains);
        await api_1.LocalStorage.setItem(BLOCKED_DOMAINS_KEY, dataToStore);
    }
    catch (error) {
        console.error("Error saving blocked domains to storage:", error);
        throw new Error("Failed to save blocked domains");
    }
}
async function addBlockedDomain(domain, notes, isEnabled = true, categories) {
    try {
        const existingDomains = await getBlockedDomains();
        const isDuplicate = existingDomains.some((item) => item.domain.toLowerCase() === domain.toLowerCase());
        if (isDuplicate) {
            throw new Error("Domain already exists in blocked list");
        }
        const newDomain = {
            domain: domain.toLowerCase(),
            dateAdded: new Date().toISOString(),
            notes: notes?.trim() || undefined,
            isEnabled,
            categories: categories || [],
        };
        const updatedDomains = [...existingDomains, newDomain];
        await saveBlockedDomains(updatedDomains);
        return true;
    }
    catch (error) {
        console.error("Error adding blocked domain:", error);
        throw error;
    }
}
async function removeBlockedDomain(domain) {
    try {
        const existingDomains = await getBlockedDomains();
        const updatedDomains = existingDomains.filter((item) => item.domain.toLowerCase() !== domain.toLowerCase());
        if (updatedDomains.length === existingDomains.length) {
            return false;
        }
        await saveBlockedDomains(updatedDomains);
        return true;
    }
    catch (error) {
        console.error("Error removing blocked domain:", error);
        throw new Error("Failed to remove blocked domain");
    }
}
async function getBlockingStatus() {
    try {
        const storedData = await api_1.LocalStorage.getItem(BLOCKING_STATUS_KEY);
        if (!storedData) {
            return { isActive: false };
        }
        const parsed = JSON.parse(storedData);
        return {
            isActive: parsed.isActive || false,
            lastActivated: parsed.lastActivated,
            lastDeactivated: parsed.lastDeactivated,
        };
    }
    catch (error) {
        console.error("Error reading blocking status from storage:", error);
        return { isActive: false };
    }
}
async function setBlockingStatus(isActive) {
    try {
        const currentStatus = await getBlockingStatus();
        const timestamp = new Date().toISOString();
        const newStatus = {
            ...currentStatus,
            isActive,
            ...(isActive
                ? { lastActivated: timestamp }
                : { lastDeactivated: timestamp }),
        };
        await api_1.LocalStorage.setItem(BLOCKING_STATUS_KEY, JSON.stringify(newStatus));
    }
    catch (error) {
        console.error("Error updating blocking status:", error);
        throw new Error("Failed to update blocking status");
    }
}
async function getBlockedDomainList() {
    const domains = await getBlockedDomains();
    return domains.map((item) => item.domain);
}
async function toggleDomainEnabled(domain) {
    try {
        const existingDomains = await getBlockedDomains();
        const domainIndex = existingDomains.findIndex((item) => item.domain.toLowerCase() === domain.toLowerCase());
        if (domainIndex === -1) {
            throw new Error("Domain not found in blocked list");
        }
        existingDomains[domainIndex].isEnabled =
            !existingDomains[domainIndex].isEnabled;
        await saveBlockedDomains(existingDomains);
        return existingDomains[domainIndex].isEnabled;
    }
    catch (error) {
        console.error("Error toggling domain enabled status:", error);
        throw error;
    }
}
async function getEnabledDomains() {
    const allDomains = await getBlockedDomains();
    return allDomains
        .filter((domain) => domain.isEnabled)
        .map((domain) => domain.domain);
}
async function clearAllBlockedDomains() {
    try {
        await api_1.LocalStorage.removeItem(BLOCKED_DOMAINS_KEY);
        await api_1.LocalStorage.removeItem(BLOCKING_STATUS_KEY);
    }
    catch (error) {
        console.error("Error clearing blocked domains:", error);
        throw new Error("Failed to clear blocked domains");
    }
}
async function getTemporaryUnblock() {
    try {
        const storedData = await api_1.LocalStorage.getItem(TEMPORARY_UNBLOCK_KEY);
        if (!storedData) {
            return { isActive: false };
        }
        const parsed = JSON.parse(storedData);
        if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
            await clearTemporaryUnblock();
            return { isActive: false };
        }
        return {
            isActive: parsed.isActive || false,
            expiresAt: parsed.expiresAt,
            duration: parsed.duration,
        };
    }
    catch (error) {
        console.error("Error reading temporary unblock:", error);
        return { isActive: false };
    }
}
async function setTemporaryUnblock(durationMinutes) {
    try {
        const settings = await getSettings();
        const duration = durationMinutes || settings.defaultUnblockDuration;
        const expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();
        const temporaryUnblock = {
            isActive: true,
            expiresAt,
            duration,
        };
        await api_1.LocalStorage.setItem(TEMPORARY_UNBLOCK_KEY, JSON.stringify(temporaryUnblock));
    }
    catch (error) {
        console.error("Error setting temporary unblock:", error);
        throw new Error("Failed to set temporary unblock");
    }
}
async function clearTemporaryUnblock() {
    try {
        await api_1.LocalStorage.removeItem(TEMPORARY_UNBLOCK_KEY);
    }
    catch (error) {
        console.error("Error clearing temporary unblock:", error);
        throw new Error("Failed to clear temporary unblock");
    }
}
async function isTemporarilyUnblocked() {
    const status = await getTemporaryUnblock();
    return status.isActive;
}
async function getCategories() {
    try {
        await api_1.LocalStorage.removeItem(CATEGORIES_KEY);
        const storedData = await api_1.LocalStorage.getItem(CATEGORIES_KEY);
        if (!storedData) {
            return [
                { name: "Social Media" },
                { name: "Video Streaming" },
                { name: "News & Media" },
                { name: "Gaming" },
                { name: "Shopping" },
                { name: "Entertainment" },
                { name: "Sports" },
                { name: "Forums & Communities" },
                { name: "Dating" },
                { name: "Gambling" },
                { name: "Betting & Casinos" },
                { name: "Work Distractions" },
                { name: "Productivity Tools" },
                { name: "Email" },
                { name: "Messaging & Chat" },
                { name: "Music & Podcasts" },
                { name: "Streaming Services" },
                { name: "E-commerce" },
                { name: "Marketplaces" },
                { name: "Fashion & Beauty" },
                { name: "Food & Cooking" },
                { name: "Travel & Booking" },
                { name: "Finance & Banking" },
                { name: "Cryptocurrency" },
                { name: "Stock Trading" },
                { name: "Job Search" },
                { name: "Education" },
                { name: "Research" },
                { name: "Development Tools" },
                { name: "Design & Creative" },
                { name: "Photo & Video Editing" },
                { name: "Cloud Storage" },
                { name: "AI Tools" },
                { name: "Blogs & Personal Sites" },
                { name: "Memes & Humor" },
                { name: "Politics" },
                { name: "Health & Fitness" },
                { name: "Religion & Spirituality" },
                { name: "Other" },
            ];
        }
        return JSON.parse(storedData);
    }
    catch (error) {
        console.error("Error reading categories:", error);
        return [];
    }
}
async function saveCategories(categories) {
    try {
        await api_1.LocalStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
    }
    catch (error) {
        console.error("Error saving categories:", error);
        throw new Error("Failed to save categories");
    }
}
async function addCategory(category) {
    try {
        const categories = await getCategories();
        if (categories.some((c) => c.name.toLowerCase() === category.name.toLowerCase())) {
            throw new Error("Category already exists");
        }
        categories.push(category);
        await saveCategories(categories);
    }
    catch (error) {
        console.error("Error adding category:", error);
        throw error;
    }
}
async function getDomainsByCategory(categoryName) {
    const domains = await getBlockedDomains();
    return domains.filter((d) => d.categories?.includes(categoryName));
}
async function bulkDeleteDomains(domains) {
    try {
        const existingDomains = await getBlockedDomains();
        const domainsLower = domains.map((d) => d.toLowerCase());
        const updatedDomains = existingDomains.filter((d) => !domainsLower.includes(d.domain.toLowerCase()));
        const deletedCount = existingDomains.length - updatedDomains.length;
        await saveBlockedDomains(updatedDomains);
        return deletedCount;
    }
    catch (error) {
        console.error("Error bulk deleting domains:", error);
        throw new Error("Failed to bulk delete domains");
    }
}
async function bulkToggleDomains(domains, enabled) {
    try {
        const existingDomains = await getBlockedDomains();
        const domainsLower = domains.map((d) => d.toLowerCase());
        let updatedCount = 0;
        const updatedDomains = existingDomains.map((d) => {
            if (domainsLower.includes(d.domain.toLowerCase())) {
                updatedCount++;
                return { ...d, isEnabled: enabled };
            }
            return d;
        });
        await saveBlockedDomains(updatedDomains);
        return updatedCount;
    }
    catch (error) {
        console.error("Error bulk toggling domains:", error);
        throw new Error("Failed to bulk toggle domains");
    }
}
async function bulkAssignCategories(domains, categories) {
    try {
        const existingDomains = await getBlockedDomains();
        const domainsLower = domains.map((d) => d.toLowerCase());
        let updatedCount = 0;
        const updatedDomains = existingDomains.map((d) => {
            if (domainsLower.includes(d.domain.toLowerCase())) {
                updatedCount++;
                const existingCategories = d.categories || [];
                const mergedCategories = Array.from(new Set([...existingCategories, ...categories]));
                return { ...d, categories: mergedCategories };
            }
            return d;
        });
        await saveBlockedDomains(updatedDomains);
        return updatedCount;
    }
    catch (error) {
        console.error("Error bulk assigning categories:", error);
        throw new Error("Failed to bulk assign categories");
    }
}
async function getSettings() {
    try {
        const storedData = await api_1.LocalStorage.getItem(SETTINGS_KEY);
        if (!storedData) {
            return { defaultUnblockDuration: 10 };
        }
        return JSON.parse(storedData);
    }
    catch (error) {
        console.error("Error reading settings:", error);
        return { defaultUnblockDuration: 10 };
    }
}
async function saveSettings(settings) {
    try {
        await api_1.LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }
    catch (error) {
        console.error("Error saving settings:", error);
        throw new Error("Failed to save settings");
    }
}
async function exportData() {
    try {
        const domains = await getBlockedDomains();
        const categories = await getCategories();
        const settings = await getSettings();
        const exportData = {
            version: "1.0.0",
            exportDate: new Date().toISOString(),
            domains,
            categories,
            settings,
        };
        return JSON.stringify(exportData, null, 2);
    }
    catch (error) {
        console.error("Error exporting data:", error);
        throw new Error("Failed to export data");
    }
}
async function importData(jsonData, merge = false) {
    try {
        const importData = JSON.parse(jsonData);
        if (!importData.domains || !Array.isArray(importData.domains)) {
            throw new Error("Invalid import data: missing or invalid domains");
        }
        if (merge) {
            const existingDomains = await getBlockedDomains();
            const existingDomainNames = existingDomains.map((d) => d.domain.toLowerCase());
            const newDomains = importData.domains.filter((d) => !existingDomainNames.includes(d.domain.toLowerCase()));
            await saveBlockedDomains([...existingDomains, ...newDomains]);
        }
        else {
            await saveBlockedDomains(importData.domains);
        }
        if (importData.categories) {
            if (merge) {
                const existingCategories = await getCategories();
                const existingCategoryNames = existingCategories.map((c) => c.name.toLowerCase());
                const newCategories = importData.categories.filter((c) => !existingCategoryNames.includes(c.name.toLowerCase()));
                await saveCategories([...existingCategories, ...newCategories]);
            }
            else {
                await saveCategories(importData.categories);
            }
        }
        if (importData.settings) {
            await saveSettings(importData.settings);
        }
    }
    catch (error) {
        console.error("Error importing data:", error);
        throw new Error("Failed to import data: " + error.message);
    }
}
//# sourceMappingURL=storage.js.map