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
    try {
        await execAsync('which sudo');
        return true;
    }
    catch {
        return false;
    }
}
async function executeWithAdminPrivileges(command) {
    const applescriptCommand = `
    do shell script "${command.replace(/"/g, '\\"')}" with administrator privileges
  `;
    try {
        const { stdout } = await execAsync(`osascript -e '${applescriptCommand}'`);
        return stdout;
    }
    catch (error) {
        if (error.message.includes('User canceled')) {
            throw new Error('Authentication was canceled by user');
        }
        throw error;
    }
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
        const backupResult = await createHostsBackup();
        if (!backupResult.success) {
            return backupResult;
        }
        const currentContent = await readHostsFile();
        const alreadyBlocked = domains.filter(domain => currentContent.includes(`${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`));
        if (alreadyBlocked.length > 0) {
            return {
                success: false,
                message: `Some domains are already blocked: ${alreadyBlocked.join(', ')}`
            };
        }
        const newEntries = generateHostsEntries(domains);
        await executeWithAdminPrivileges(`echo "${newEntries}" >> "${HOSTS_FILE_PATH}"`);
        await executeWithAdminPrivileges('dscacheutil -flushcache');
        return {
            success: true,
            message: `Successfully blocked ${domains.length} domain(s)`,
            backupCreated: backupResult.backupCreated
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Failed to add domains to hosts file: ${error.message}`
        };
    }
}
async function removeDomainsFromHosts() {
    try {
        const currentContent = await readHostsFile();
        if (!currentContent.includes(WEBGLOCKER_TAG)) {
            return {
                success: true,
                message: 'No blocked domains found in hosts file'
            };
        }
        const lines = currentContent.split('\\n');
        const filteredLines = lines.filter(line => !line.includes(WEBGLOCKER_TAG));
        const filteredContent = filteredLines.join('\\n');
        const tempFile = '/tmp/hosts_temp';
        await executeWithAdminPrivileges(`echo "${filteredContent}" > "${tempFile}"`);
        await executeWithAdminPrivileges(`mv "${tempFile}" "${HOSTS_FILE_PATH}"`);
        await executeWithAdminPrivileges('dscacheutil -flushcache');
        return {
            success: true,
            message: 'Successfully removed all blocked domains from hosts file'
        };
    }
    catch (error) {
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