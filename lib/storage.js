"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBlockedDomains = getBlockedDomains;
exports.saveBlockedDomains = saveBlockedDomains;
exports.addBlockedDomain = addBlockedDomain;
exports.removeBlockedDomain = removeBlockedDomain;
exports.getBlockingStatus = getBlockingStatus;
exports.setBlockingStatus = setBlockingStatus;
exports.getBlockedDomainList = getBlockedDomainList;
exports.clearAllBlockedDomains = clearAllBlockedDomains;
const api_1 = require("@raycast/api");
const BLOCKED_DOMAINS_KEY = 'blocked-domains';
const BLOCKING_STATUS_KEY = 'blocking-status';
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
        return parsed.map(item => ({
            domain: item.domain || '',
            dateAdded: item.dateAdded || new Date().toISOString(),
            notes: item.notes || undefined
        }));
    }
    catch (error) {
        console.error('Error reading blocked domains from storage:', error);
        return [];
    }
}
async function saveBlockedDomains(domains) {
    try {
        const dataToStore = JSON.stringify(domains);
        await api_1.LocalStorage.setItem(BLOCKED_DOMAINS_KEY, dataToStore);
    }
    catch (error) {
        console.error('Error saving blocked domains to storage:', error);
        throw new Error('Failed to save blocked domains');
    }
}
async function addBlockedDomain(domain, notes) {
    try {
        const existingDomains = await getBlockedDomains();
        const isDuplicate = existingDomains.some(item => item.domain.toLowerCase() === domain.toLowerCase());
        if (isDuplicate) {
            throw new Error('Domain already exists in blocked list');
        }
        const newDomain = {
            domain: domain.toLowerCase(),
            dateAdded: new Date().toISOString(),
            notes: notes?.trim() || undefined
        };
        const updatedDomains = [...existingDomains, newDomain];
        await saveBlockedDomains(updatedDomains);
        return true;
    }
    catch (error) {
        console.error('Error adding blocked domain:', error);
        throw error;
    }
}
async function removeBlockedDomain(domain) {
    try {
        const existingDomains = await getBlockedDomains();
        const updatedDomains = existingDomains.filter(item => item.domain.toLowerCase() !== domain.toLowerCase());
        if (updatedDomains.length === existingDomains.length) {
            return false;
        }
        await saveBlockedDomains(updatedDomains);
        return true;
    }
    catch (error) {
        console.error('Error removing blocked domain:', error);
        throw new Error('Failed to remove blocked domain');
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
            lastDeactivated: parsed.lastDeactivated
        };
    }
    catch (error) {
        console.error('Error reading blocking status from storage:', error);
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
                : { lastDeactivated: timestamp })
        };
        await api_1.LocalStorage.setItem(BLOCKING_STATUS_KEY, JSON.stringify(newStatus));
    }
    catch (error) {
        console.error('Error updating blocking status:', error);
        throw new Error('Failed to update blocking status');
    }
}
async function getBlockedDomainList() {
    const domains = await getBlockedDomains();
    return domains.map(item => item.domain);
}
async function clearAllBlockedDomains() {
    try {
        await api_1.LocalStorage.removeItem(BLOCKED_DOMAINS_KEY);
        await api_1.LocalStorage.removeItem(BLOCKING_STATUS_KEY);
    }
    catch (error) {
        console.error('Error clearing blocked domains:', error);
        throw new Error('Failed to clear blocked domains');
    }
}
//# sourceMappingURL=storage.js.map