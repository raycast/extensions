/**
 * Storage utilities for managing blocked domains using Raycast LocalStorage
 */

import { LocalStorage } from '@raycast/api';

// Storage keys
const BLOCKED_DOMAINS_KEY = 'blocked-domains';
const BLOCKING_STATUS_KEY = 'blocking-status';

// Types
export interface BlockedDomain {
  domain: string;
  dateAdded: string;
  notes?: string;
}

export interface BlockingStatus {
  isActive: boolean;
  lastActivated?: string;
  lastDeactivated?: string;
}

/**
 * Gets all blocked domains from storage
 * @returns Promise resolving to array of blocked domains
 */
export async function getBlockedDomains(): Promise<BlockedDomain[]> {
  try {
    const storedData = await LocalStorage.getItem<string>(BLOCKED_DOMAINS_KEY);
    
    if (!storedData) {
      return [];
    }

    const parsed = JSON.parse(storedData);
    
    // Ensure it's an array and has proper structure
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(item => ({
      domain: item.domain || '',
      dateAdded: item.dateAdded || new Date().toISOString(),
      notes: item.notes || undefined
    }));
  } catch (error) {
    console.error('Error reading blocked domains from storage:', error);
    return [];
  }
}

/**
 * Saves blocked domains to storage
 * @param domains - Array of blocked domains to save
 */
export async function saveBlockedDomains(domains: BlockedDomain[]): Promise<void> {
  try {
    const dataToStore = JSON.stringify(domains);
    await LocalStorage.setItem(BLOCKED_DOMAINS_KEY, dataToStore);
  } catch (error) {
    console.error('Error saving blocked domains to storage:', error);
    throw new Error('Failed to save blocked domains');
  }
}

/**
 * Adds a domain to the blocked list
 * @param domain - Domain to add
 * @param notes - Optional notes about the domain
 * @returns Promise resolving to success status
 */
export async function addBlockedDomain(domain: string, notes?: string): Promise<boolean> {
  try {
    const existingDomains = await getBlockedDomains();
    
    // Check for duplicates (case-insensitive)
    const isDuplicate = existingDomains.some(
      item => item.domain.toLowerCase() === domain.toLowerCase()
    );
    
    if (isDuplicate) {
      throw new Error('Domain already exists in blocked list');
    }

    const newDomain: BlockedDomain = {
      domain: domain.toLowerCase(),
      dateAdded: new Date().toISOString(),
      notes: notes?.trim() || undefined
    };

    const updatedDomains = [...existingDomains, newDomain];
    await saveBlockedDomains(updatedDomains);
    
    return true;
  } catch (error) {
    console.error('Error adding blocked domain:', error);
    throw error;
  }
}

/**
 * Removes a domain from the blocked list
 * @param domain - Domain to remove
 * @returns Promise resolving to success status
 */
export async function removeBlockedDomain(domain: string): Promise<boolean> {
  try {
    const existingDomains = await getBlockedDomains();
    
    const updatedDomains = existingDomains.filter(
      item => item.domain.toLowerCase() !== domain.toLowerCase()
    );
    
    // Check if any domain was actually removed
    if (updatedDomains.length === existingDomains.length) {
      return false; // Domain not found
    }

    await saveBlockedDomains(updatedDomains);
    return true;
  } catch (error) {
    console.error('Error removing blocked domain:', error);
    throw new Error('Failed to remove blocked domain');
  }
}

/**
 * Gets the current blocking status
 * @returns Promise resolving to blocking status
 */
export async function getBlockingStatus(): Promise<BlockingStatus> {
  try {
    const storedData = await LocalStorage.getItem<string>(BLOCKING_STATUS_KEY);
    
    if (!storedData) {
      return { isActive: false };
    }

    const parsed = JSON.parse(storedData);
    return {
      isActive: parsed.isActive || false,
      lastActivated: parsed.lastActivated,
      lastDeactivated: parsed.lastDeactivated
    };
  } catch (error) {
    console.error('Error reading blocking status from storage:', error);
    return { isActive: false };
  }
}

/**
 * Updates the blocking status
 * @param isActive - Whether blocking is currently active
 */
export async function setBlockingStatus(isActive: boolean): Promise<void> {
  try {
    const currentStatus = await getBlockingStatus();
    const timestamp = new Date().toISOString();
    
    const newStatus: BlockingStatus = {
      ...currentStatus,
      isActive,
      ...(isActive 
        ? { lastActivated: timestamp }
        : { lastDeactivated: timestamp }
      )
    };

    await LocalStorage.setItem(BLOCKING_STATUS_KEY, JSON.stringify(newStatus));
  } catch (error) {
    console.error('Error updating blocking status:', error);
    throw new Error('Failed to update blocking status');
  }
}

/**
 * Gets just the domain names as strings for easier processing
 * @returns Promise resolving to array of domain strings
 */
export async function getBlockedDomainList(): Promise<string[]> {
  const domains = await getBlockedDomains();
  return domains.map(item => item.domain);
}

/**
 * Clears all blocked domains (useful for reset functionality)
 */
export async function clearAllBlockedDomains(): Promise<void> {
  try {
    await LocalStorage.removeItem(BLOCKED_DOMAINS_KEY);
    await LocalStorage.removeItem(BLOCKING_STATUS_KEY);
  } catch (error) {
    console.error('Error clearing blocked domains:', error);
    throw new Error('Failed to clear blocked domains');
  }
}