/**
 * Hosts file manager for safely modifying /etc/hosts with admin privileges
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

// Constants
const HOSTS_FILE_PATH = '/etc/hosts';
const BACKUP_FILE_PATH = '/etc/hosts.webblocker.bak';
const WEBGLOCKER_TAG = '# WebBlocker';
const REDIRECT_IP = '127.0.0.1';

export interface HostsOperationResult {
  success: boolean;
  message: string;
  backupCreated?: boolean;
}

/**
 * Checks if admin privileges are available (always true on macOS with AppleScript)
 * @returns Promise resolving to true since we use AppleScript authentication
 */
export async function isSudoAvailable(): Promise<boolean> {
  // We use AppleScript with "administrator privileges" which handles authentication
  // via the native macOS dialog, so this should always return true on macOS
  return true;
}

/**
 * Executes a command with admin privileges using AppleScript
 * This provides a native macOS authentication dialog
 * @param command - Shell command to execute with admin privileges
 * @returns Promise resolving to command output
 */
async function executeWithAdminPrivileges(command: string): Promise<string> {
  const applescriptCommand = `
    do shell script "${command.replace(/"/g, '\\"')}" with administrator privileges
  `;
  
  try {
    const { stdout } = await execAsync(`osascript -e '${applescriptCommand}'`);
    return stdout;
  } catch (error: any) {
    // Handle user cancellation of authentication dialog
    if (error.message.includes('User canceled')) {
      throw new Error('Authentication was canceled by user');
    }
    throw error;
  }
}

/**
 * Reads the current hosts file content
 * @returns Promise resolving to hosts file content
 */
export async function readHostsFile(): Promise<string> {
  try {
    const content = await executeWithAdminPrivileges(`cat "${HOSTS_FILE_PATH}"`);
    return content;
  } catch (error: any) {
    throw new Error(`Failed to read hosts file: ${error.message}`);
  }
}

/**
 * Creates a backup of the current hosts file
 * @returns Promise resolving to operation result
 */
export async function createHostsBackup(): Promise<HostsOperationResult> {
  try {
    // Check if backup already exists
    try {
      await executeWithAdminPrivileges(`test -f "${BACKUP_FILE_PATH}"`);
      // Backup exists, skip creation
      return {
        success: true,
        message: 'Backup already exists',
        backupCreated: false
      };
    } catch {
      // Backup doesn't exist, create it
    }

    await executeWithAdminPrivileges(`cp "${HOSTS_FILE_PATH}" "${BACKUP_FILE_PATH}"`);
    
    return {
      success: true,
      message: 'Backup created successfully',
      backupCreated: true
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to create backup: ${error.message}`,
      backupCreated: false
    };
  }
}

/**
 * Restores hosts file from backup
 * @returns Promise resolving to operation result
 */
export async function restoreHostsFromBackup(): Promise<HostsOperationResult> {
  try {
    // Check if backup exists
    try {
      await executeWithAdminPrivileges(`test -f "${BACKUP_FILE_PATH}"`);
    } catch {
      return {
        success: false,
        message: 'No backup file found to restore from'
      };
    }

    await executeWithAdminPrivileges(`cp "${BACKUP_FILE_PATH}" "${HOSTS_FILE_PATH}"`);
    
    return {
      success: true,
      message: 'Hosts file restored from backup successfully'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to restore from backup: ${error.message}`
    };
  }
}

/**
 * Generates hosts file entries for blocking domains
 * @param domains - Array of domains to block
 * @returns String containing hosts file entries
 */
function generateHostsEntries(domains: string[]): string {
  if (domains.length === 0) return '';
  
  const entries = domains.map(domain => `${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`);
  return `\\n\\n# WebBlocker - Added by Raycast WebBlocker Extension\\n${entries.join('\\n')}\\n`;
}

/**
 * Adds domains to the hosts file for blocking
 * @param domains - Array of domains to block
 * @returns Promise resolving to operation result
 */
export async function addDomainsToHosts(domains: string[]): Promise<HostsOperationResult> {
  if (!domains || domains.length === 0) {
    return {
      success: false,
      message: 'No domains provided to block'
    };
  }

  try {
    // Create backup first
    const backupResult = await createHostsBackup();
    if (!backupResult.success) {
      return backupResult;
    }

    // Read current hosts file
    const currentContent = await readHostsFile();
    
    // Check if any domains are already blocked
    const alreadyBlocked = domains.filter(domain => 
      currentContent.includes(`${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`)
    );
    
    if (alreadyBlocked.length > 0) {
      return {
        success: false,
        message: `Some domains are already blocked: ${alreadyBlocked.join(', ')}`
      };
    }

    // Generate new entries
    const newEntries = generateHostsEntries(domains);
    
    // Append to hosts file
    await executeWithAdminPrivileges(`echo "${newEntries}" >> "${HOSTS_FILE_PATH}"`);
    
    // Flush DNS cache on macOS
    await executeWithAdminPrivileges('dscacheutil -flushcache');
    
    return {
      success: true,
      message: `Successfully blocked ${domains.length} domain(s)`,
      backupCreated: backupResult.backupCreated
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to add domains to hosts file: ${error.message}`
    };
  }
}

/**
 * Removes SiteBlocker entries from the hosts file
 * @returns Promise resolving to operation result
 */
export async function removeDomainsFromHosts(): Promise<HostsOperationResult> {
  try {
    // Read current hosts file
    const currentContent = await readHostsFile();
    
    // Check if there are any WebBlocker entries
    if (!currentContent.includes(WEBGLOCKER_TAG)) {
      return {
        success: true,
        message: 'No blocked domains found in hosts file'
      };
    }

    // Create a temporary file with filtered content
    const lines = currentContent.split('\\n');
    const filteredLines = lines.filter(line => !line.includes(WEBGLOCKER_TAG));
    const filteredContent = filteredLines.join('\\n');
    
    // Write the filtered content back to hosts file
    const tempFile = '/tmp/hosts_temp';
    await executeWithAdminPrivileges(`echo "${filteredContent}" > "${tempFile}"`);
    await executeWithAdminPrivileges(`mv "${tempFile}" "${HOSTS_FILE_PATH}"`);
    
    // Flush DNS cache
    await executeWithAdminPrivileges('dscacheutil -flushcache');
    
    return {
      success: true,
      message: 'Successfully removed all blocked domains from hosts file'
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to remove domains from hosts file: ${error.message}`
    };
  }
}

/**
 * Checks if domains are currently blocked in hosts file
 * @param domains - Array of domains to check
 * @returns Promise resolving to object indicating which domains are blocked
 */
export async function checkDomainsBlocked(domains: string[]): Promise<{[domain: string]: boolean}> {
  try {
    const currentContent = await readHostsFile();
    const result: {[domain: string]: boolean} = {};
    
    domains.forEach(domain => {
      result[domain] = currentContent.includes(`${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`);
    });
    
    return result;
  } catch (error: any) {
    console.error('Error checking blocked domains:', error);
    // Return all as false if we can't read the file
    const result: {[domain: string]: boolean} = {};
    domains.forEach(domain => {
      result[domain] = false;
    });
    return result;
  }
}

/**
 * Gets all currently blocked domains from hosts file
 * @returns Promise resolving to array of blocked domain names
 */
export async function getBlockedDomainsFromHosts(): Promise<string[]> {
  try {
    const currentContent = await readHostsFile();
    const lines = currentContent.split('\\n');
    
    const blockedDomains: string[] = [];
    lines.forEach(line => {
      if (line.includes(WEBGLOCKER_TAG) && line.includes(REDIRECT_IP)) {
        const parts = line.trim().split(/\\s+/);
        if (parts.length >= 2 && parts[0] === REDIRECT_IP) {
          blockedDomains.push(parts[1]);
        }
      }
    });
    
    return blockedDomains;
  } catch (error: any) {
    console.error('Error reading blocked domains from hosts file:', error);
    return [];
  }
}