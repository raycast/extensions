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
  // Properly escape the command for AppleScript
  const escapedCommand = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const applescriptCommand = `do shell script "${escapedCommand}" with administrator privileges`;
  
  try {
    const { stdout } = await execAsync(`osascript -e '${applescriptCommand}'`);
    return stdout;
  } catch (error: any) {
    // Handle user cancellation of authentication dialog
    if (error.message.includes('User canceled') || error.message.includes('canceled')) {
      throw new Error('Authentication was canceled by user');
    }
    throw error;
  }
}

/**
 * Executes multiple commands in a single authentication session
 * This reduces password prompts to just one
 */
async function executeMultipleWithAdminPrivileges(commands: string[]): Promise<string[]> {
  const combinedCommand = commands.join(' && ');
  const result = await executeWithAdminPrivileges(combinedCommand);
  return result.split('\n').filter(line => line.trim() !== '');
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
    // Generate entries for all domains
    const entries = domains.map(domain => `${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`);
    const tempFile = '/tmp/webblocker_entries.txt';
    
    // Create commands that are simple and safe
    const commands = [
      // Create backup if it doesn't exist
      `test -f "${BACKUP_FILE_PATH}" || cp "${HOSTS_FILE_PATH}" "${BACKUP_FILE_PATH}"`,
      // Create temporary file with our entries
      `echo "" > "${tempFile}"`,
      `echo "" >> "${tempFile}"`,
      `echo "# WebBlocker - Added by Raycast WebBlocker Extension" >> "${tempFile}"`,
      ...entries.map(entry => `echo "${entry}" >> "${tempFile}"`),
      // Append to hosts file
      `cat "${tempFile}" >> "${HOSTS_FILE_PATH}"`,
      // Clean up
      `rm "${tempFile}"`,
      // Flush DNS
      'dscacheutil -flushcache'
    ];

    await executeMultipleWithAdminPrivileges(commands);
    
    return {
      success: true,
      message: `Successfully blocked ${domains.length} domain(s)`,
      backupCreated: true
    };
  } catch (error: any) {
    if (error.message.includes('Authentication was canceled')) {
      return {
        success: false,
        message: 'Authentication was canceled by user'
      };
    }
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
    const tempFile = '/tmp/hosts_filtered.txt';
    
    const commands = [
      // Filter out WebBlocker entries
      `grep -v "${WEBGLOCKER_TAG}" "${HOSTS_FILE_PATH}" > "${tempFile}"`,
      // Replace hosts file with filtered version
      `cp "${tempFile}" "${HOSTS_FILE_PATH}"`,
      // Clean up
      `rm "${tempFile}"`,
      // Flush DNS
      'dscacheutil -flushcache'
    ];

    await executeMultipleWithAdminPrivileges(commands);
    
    return {
      success: true,
      message: 'Successfully removed all blocked domains from hosts file'
    };
  } catch (error: any) {
    if (error.message.includes('Authentication was canceled')) {
      return {
        success: false,
        message: 'Authentication was canceled by user'
      };
    }
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