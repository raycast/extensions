"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSudoAvailable = isSudoAvailable;
exports.readHostsFile = readHostsFile;
exports.createHostsBackup = createHostsBackup;
exports.restoreHostsFromBackup = restoreHostsFromBackup;
exports.addDomainsToHosts = addDomainsToHosts;
exports.removeDomainsFromHosts = removeDomainsFromHosts;
exports.checkDomainsBlocked = checkDomainsBlocked;
exports.getBlockedDomainsFromHosts = getBlockedDomainsFromHosts;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const HOSTS_FILE_PATH = '/etc/hosts';
const BACKUP_FILE_PATH = '/etc/hosts.webblocker.bak';
const WEBGLOCKER_TAG = '# WebBlocker';
const REDIRECT_IP = '127.0.0.1';
async function isSudoAvailable() {
    return true;
}
async function executeWithAdminPrivileges(command) {
    const escapedCommand = command.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    const applescriptCommand = `do shell script "${escapedCommand}" with administrator privileges`;
    try {
        const { stdout } = await execAsync(`osascript -e '${applescriptCommand}'`);
        return stdout;
    }
    catch (error) {
        if (error.message.includes('User canceled') || error.message.includes('canceled')) {
            throw new Error('Authentication was canceled by user');
        }
        throw error;
    }
}
async function executeMultipleWithAdminPrivileges(commands) {
    const combinedCommand = commands.join(' && ');
    const result = await executeWithAdminPrivileges(combinedCommand);
    return result.split('\n').filter(line => line.trim() !== '');
}
async function readHostsFile() {
    try {
        const content = await executeWithAdminPrivileges(`cat "${HOSTS_FILE_PATH}"`);
        return content;
    }
    catch (error) {
        throw new Error(`Failed to read hosts file: ${error.message}`);
    }
}
async function createHostsBackup() {
    try {
        try {
            await executeWithAdminPrivileges(`test -f "${BACKUP_FILE_PATH}"`);
            return {
                success: true,
                message: 'Backup already exists',
                backupCreated: false
            };
        }
        catch {
        }
        await executeWithAdminPrivileges(`cp "${HOSTS_FILE_PATH}" "${BACKUP_FILE_PATH}"`);
        return {
            success: true,
            message: 'Backup created successfully',
            backupCreated: true
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Failed to create backup: ${error.message}`,
            backupCreated: false
        };
    }
}
async function restoreHostsFromBackup() {
    try {
        try {
            await executeWithAdminPrivileges(`test -f "${BACKUP_FILE_PATH}"`);
        }
        catch {
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
    }
    catch (error) {
        return {
            success: false,
            message: `Failed to restore from backup: ${error.message}`
        };
    }
}
function generateHostsEntries(domains) {
    if (domains.length === 0)
        return '';
    const entries = domains.map(domain => `${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`);
    return `\\n\\n# WebBlocker - Added by Raycast WebBlocker Extension\\n${entries.join('\\n')}\\n`;
}
async function addDomainsToHosts(domains) {
    if (!domains || domains.length === 0) {
        return {
            success: false,
            message: 'No domains provided to block'
        };
    }
    try {
        const entriesContent = domains.map(domain => `${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`).join('\n');
        const script = `
      # Backup hosts file if backup doesn't exist
      if [ ! -f "${BACKUP_FILE_PATH}" ]; then
        cp "${HOSTS_FILE_PATH}" "${BACKUP_FILE_PATH}"
      fi
      
      # Add WebBlocker entries to hosts file
      echo "" >> "${HOSTS_FILE_PATH}"
      echo "" >> "${HOSTS_FILE_PATH}"
      echo "# WebBlocker - Added by Raycast WebBlocker Extension" >> "${HOSTS_FILE_PATH}"
      echo '${entriesContent}' >> "${HOSTS_FILE_PATH}"
      
      # Flush DNS cache
      dscacheutil -flushcache
      
      # Output success message
      echo "WebBlocker: Successfully added ${domains.length} domain(s)"
    `;
        const result = await executeWithAdminPrivileges(script);
        return {
            success: true,
            message: `Successfully blocked ${domains.length} domain(s)`,
            backupCreated: true
        };
    }
    catch (error) {
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
async function removeDomainsFromHosts() {
    try {
        const script = `
      # Filter out WebBlocker entries from hosts file
      grep -v "${WEBGLOCKER_TAG}" "${HOSTS_FILE_PATH}" > "/tmp/hosts_filtered.txt"
      
      # Replace hosts file with filtered version
      cp "/tmp/hosts_filtered.txt" "${HOSTS_FILE_PATH}"
      
      # Clean up temporary file
      rm "/tmp/hosts_filtered.txt"
      
      # Flush DNS cache
      dscacheutil -flushcache
      
      # Output success message
      echo "WebBlocker: Successfully removed all blocked domains"
    `;
        const result = await executeWithAdminPrivileges(script);
        return {
            success: true,
            message: 'Successfully removed all blocked domains from hosts file'
        };
    }
    catch (error) {
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
async function checkDomainsBlocked(domains) {
    try {
        const currentContent = await readHostsFile();
        const result = {};
        domains.forEach(domain => {
            result[domain] = currentContent.includes(`${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`);
        });
        return result;
    }
    catch (error) {
        console.error('Error checking blocked domains:', error);
        const result = {};
        domains.forEach(domain => {
            result[domain] = false;
        });
        return result;
    }
}
async function getBlockedDomainsFromHosts() {
    try {
        const currentContent = await readHostsFile();
        const lines = currentContent.split('\\n');
        const blockedDomains = [];
        lines.forEach(line => {
            if (line.includes(WEBGLOCKER_TAG) && line.includes(REDIRECT_IP)) {
                const parts = line.trim().split(/\\s+/);
                if (parts.length >= 2 && parts[0] === REDIRECT_IP) {
                    blockedDomains.push(parts[1]);
                }
            }
        });
        return blockedDomains;
    }
    catch (error) {
        console.error('Error reading blocked domains from hosts file:', error);
        return [];
    }
}
//# sourceMappingURL=hostsManager.js.map