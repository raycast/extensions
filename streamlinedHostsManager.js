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
exports.enableBlocking = enableBlocking;
exports.disableBlocking = disableBlocking;
exports.checkDomainsBlocked = checkDomainsBlocked;
exports.getBlockedDomainsFromHosts = getBlockedDomainsFromHosts;
exports.clearPasswordSession = clearPasswordSession;
exports.getPasswordSessionInfo = getPasswordSessionInfo;
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const passwordManager_1 = __importDefault(require("./passwordManager"));
const browserRefresher_1 = require("./browserRefresher");
const browserCacheClearer_1 = require("./browserCacheClearer");
const biometricAuth_1 = require("./biometricAuth");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const HOSTS_FILE_PATH = "/etc/hosts";
const BACKUP_FILE_PATH = "/etc/hosts.webblocker.bak";
const WEBGLOCKER_TAG = "# WebBlocker";
const REDIRECT_IP = "127.0.0.1";
async function getRunningBrowsers() {
    const browsers = [
        { name: "Safari", process: "Safari" },
        { name: "Google Chrome", process: "Google Chrome" },
        { name: "Firefox", process: "firefox" },
        { name: "Microsoft Edge", process: "Microsoft Edge" },
        { name: "Arc", process: "Arc" },
    ];
    const runningBrowsers = [];
    for (const browser of browsers) {
        try {
            const { stdout } = await execAsync(`pgrep -f "${browser.process}"`);
            if (stdout.trim()) {
                runningBrowsers.push(browser.name);
            }
        }
        catch (error) {
        }
    }
    return runningBrowsers;
}
function extractDomain(input) {
    let domain = input.toLowerCase().trim();
    domain = domain.replace(/^[a-z]+:\/\//, "");
    domain = domain.split("/")[0];
    domain = domain.split("?")[0];
    domain = domain.split("#")[0];
    domain = domain.split(":")[0];
    return domain;
}
async function createBlockingScript(domains) {
    const expandedDomains = [];
    domains.forEach((domain) => {
        const cleanDomain = extractDomain(domain);
        if (!cleanDomain)
            return;
        expandedDomains.push(cleanDomain);
        if (!cleanDomain.startsWith("www.")) {
            expandedDomains.push(`www.${cleanDomain}`);
        }
        else {
            expandedDomains.push(cleanDomain.replace(/^www\./, ""));
        }
    });
    const uniqueDomains = Array.from(new Set(expandedDomains));
    const domainEntries = uniqueDomains
        .map((domain) => `echo "${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}" >> "${HOSTS_FILE_PATH}"`)
        .join("\n");
    const networkRefresh = `
# Function: return active network service names
get_active_services() {
  networksetup -listnetworkserviceorder | awk '
    /\([0-9]+\) / { svc=$0; sub(/^\([0-9]+\) /, "", svc); getline; if (match($0, /Device: ([^\)]+)/, m)) { dev=m[1]; printf "%s|%s\n", svc, dev; } }
  ' | while IFS='|' read -r svc dev; do
      if ifconfig "$dev" 2>/dev/null | grep -q "status: active"; then
        echo "$svc"
      fi
    done
}

# Briefly disable/enable each active network service to force reconnects
for svc in $(get_active_services); do
  echo "🔁 Cycling network service: $svc"
  networksetup -setnetworkserviceenabled "$svc" off 2>/dev/null || true
  sleep 1
  networksetup -setnetworkserviceenabled "$svc" on 2>/dev/null || true
  sleep 1
done
`;
    return `#!/bin/bash
# WebBlocker comprehensive blocking script with aggressive DNS flushing

# Error handling - continue on errors but log them
set +e

log_error() {
  echo "⚠️ Warning: $1 (continuing...)"
}

echo "🚫 Starting comprehensive website blocking..."

# 0. AGGRESSIVE PRE-FLUSH before modifying hosts file
echo "🧹 Step 1/5: Pre-flushing ALL DNS caches..."

# System DNS flush (multiple attempts)
for i in {1..3}; do
  dscacheutil -flushcache 2>/dev/null || log_error "dscacheutil flush attempt $i failed"
  killall -HUP mDNSResponder 2>/dev/null || log_error "mDNSResponder restart attempt $i failed"
  sleep 0.5
done

# Kill all DNS-related processes
killall mDNSResponderHelper 2>/dev/null || true
killall mDNSResponder 2>/dev/null || true

# Restart mDNSResponder service
launchctl kickstart -k system/com.apple.mDNSResponder 2>/dev/null || log_error "launchctl kickstart failed"

# Clear system DNS cache directories
rm -rf /var/db/mds/messages/501/* 2>/dev/null || true
rm -rf /Library/Caches/com.apple.mDNSResponder/* 2>/dev/null || true

# Flush network tables
route -n flush 2>/dev/null || log_error "route flush failed"
arp -a -d 2>/dev/null || log_error "arp flush failed"

echo "✅ Pre-flush completed"

# 1. Create backup if it doesn't exist
echo "📦 Step 2/5: Creating backup..."
if [ ! -f "${BACKUP_FILE_PATH}" ]; then
    cp "${HOSTS_FILE_PATH}" "${BACKUP_FILE_PATH}" 2>/dev/null || log_error "backup creation failed"
    echo "✅ Backup created at ${BACKUP_FILE_PATH}"
else
    echo "✅ Backup already exists"
fi

# 2. Add domain entries to hosts file
echo "📝 Step 3/5: Adding ${domains.length} domain(s) to hosts file..."
echo "" >> "${HOSTS_FILE_PATH}"
echo "# WebBlocker - Added by Raycast WebBlocker Extension" >> "${HOSTS_FILE_PATH}"
${domainEntries}

echo "✅ Hosts file updated"

# 3. AGGRESSIVE POST-FLUSH after modifying hosts file
echo "🧹 Step 4/5: Post-flushing DNS (ultra-aggressive)..."

# Multiple rounds of DNS flushing
for round in {1..5}; do
  echo "  Round $round/5..."
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true
  sleep 0.3
done

# Force restart mDNSResponder
launchctl unload /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist 2>/dev/null || true
launchctl load /System/Library/LaunchDaemons/com.apple.mDNSResponder.plist 2>/dev/null || true
launchctl kickstart -k system/com.apple.mDNSResponder 2>/dev/null || true

# Network interface reset (all active interfaces)
for iface in en0 en1 en2 en3 en4; do
  if ifconfig $iface 2>/dev/null | grep -q "status: active"; then
    echo "  Resetting $iface..."
    ifconfig $iface down 2>/dev/null || true
    sleep 0.5
    ifconfig $iface up 2>/dev/null || true
  fi
done

# Final aggressive flush
sleep 1
for i in {1..3}; do
  dscacheutil -flushcache 2>/dev/null || true
  killall -HUP mDNSResponder 2>/dev/null || true
done

echo "✅ DNS caches cleared aggressively"

# 4. Network service cycling to drop existing connections
echo "🔄 Step 5/5: Cycling network services..."
${networkRefresh}

echo "✅ Network services cycled"
echo ""
echo "🎉 Blocking enabled successfully!"
echo "Blocked domains: ${domains.join(", ")}"
`;
}
async function createUnblockingScript() {
    const networkRefresh = `
# Function: return active network service names
get_active_services() {
  networksetup -listnetworkserviceorder | awk '
    /\([0-9]+\) / { svc=$0; sub(/^\([0-9]+\) /, "", svc); getline; if (match($0, /Device: ([^\)]+)/, m)) { dev=m[1]; printf "%s|%s\n", svc, dev; } }
  ' | while IFS='|' read -r svc dev; do
      if ifconfig "$dev" 2>/dev/null | grep -q "status: active"; then
        echo "$svc"
      fi
    done
}

# Briefly disable/enable each active network service to force reconnects
for svc in $(get_active_services); do
  echo "🔁 Cycling network service: $svc"
  networksetup -setnetworkserviceenabled "$svc" off 2>/dev/null || true
  sleep 1
  networksetup -setnetworkserviceenabled "$svc" on 2>/dev/null || true
  sleep 1
done
`;
    return `#!/bin/bash
# WebBlocker comprehensive unblocking script (no browser restarts)

set -e  # Exit on any error

echo "✅ Starting website unblocking..."

# 1. Remove WebBlocker entries from hosts file
echo "📝 Removing blocked domains..."
grep -v "${WEBGLOCKER_TAG}" "${HOSTS_FILE_PATH}" > "/tmp/hosts_filtered.txt"
cp "/tmp/hosts_filtered.txt" "${HOSTS_FILE_PATH}"
rm "/tmp/hosts_filtered.txt"

# 2. Clear all DNS caches
echo "🧹 Clearing DNS caches..."
dscacheutil -flushcache
killall -HUP mDNSResponder 2>/dev/null || true
launchctl kickstart -k system/com.apple.mDNSResponder 2>/dev/null || true
sleep 2
dscacheutil -flushcache

# 3. Brief network refresh to drop existing connections (no browser restart)
${networkRefresh}

echo "🎉 All websites unblocked successfully!"
`;
}
async function enableBlocking(domains) {
    if (!domains || domains.length === 0) {
        return {
            success: false,
            message: "No domains provided to block",
        };
    }
    try {
        console.log(`🚫 Closing ${domains.length} blocked website tabs...`);
        await (0, browserRefresher_1.closeBlockedTabs)(domains).catch((error) => {
            console.error("Error closing tabs:", error);
        });
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log("🧹 Clearing browser caches for immediate blocking...");
        await (0, browserCacheClearer_1.clearAllBrowserCaches)().catch((error) => {
            console.error("Error clearing browser caches:", error);
        });
        console.log("📝 Creating blocking script...");
        const scriptContent = await createBlockingScript(domains);
        const tempScriptPath = "/tmp/webblocker_enable.sh";
        await fs.writeFile(tempScriptPath, scriptContent);
        await execAsync(`chmod +x ${tempScriptPath}`);
        console.log("🔐 Requesting Touch ID/password...");
        const execResult = await (0, biometricAuth_1.executeScriptWithAuth)(tempScriptPath, "WebBlocker needs to modify system files to block websites");
        if (!execResult.success) {
            await execAsync(`rm -f ${tempScriptPath}`);
            return {
                success: false,
                message: execResult.error || "Authentication failed",
            };
        }
        console.log("✅ Blocking applied successfully!");
        await execAsync(`rm -f ${tempScriptPath}`);
        console.log("🔄 Forcing browser DNS flush...");
        await (0, browserCacheClearer_1.forceBrowserDNSFlush)().catch((error) => {
            console.error("Error forcing browser DNS flush:", error);
        });
        console.log("🔄 Final network service restart...");
        await (0, browserCacheClearer_1.restartNetworkServices)().catch((error) => {
            console.error("Error restarting network services:", error);
        });
        return {
            success: true,
            message: `Successfully blocked ${domains.length} website(s) with immediate effect`,
        };
    }
    catch (error) {
        if (error.message.includes("User canceled")) {
            return {
                success: false,
                message: "Authentication was canceled by user",
            };
        }
        return {
            success: false,
            message: `Failed to enable blocking: ${error.message}`,
        };
    }
}
async function disableBlocking() {
    try {
        const blockedDomains = await getBlockedDomainsFromHosts();
        console.log("📝 Creating unblocking script...");
        const scriptContent = await createUnblockingScript();
        const tempScriptPath = "/tmp/webblocker_disable.sh";
        await fs.writeFile(tempScriptPath, scriptContent);
        await execAsync(`chmod +x ${tempScriptPath}`);
        console.log("🔐 Requesting Touch ID/password...");
        const execResult = await (0, biometricAuth_1.executeScriptWithAuth)(tempScriptPath, "WebBlocker needs to modify system files to unblock websites");
        if (!execResult.success) {
            await execAsync(`rm -f ${tempScriptPath}`);
            return {
                success: false,
                message: execResult.error || "Authentication failed",
            };
        }
        console.log("✅ Unblocking completed successfully!");
        await execAsync(`rm -f ${tempScriptPath}`);
        return {
            success: true,
            message: "Successfully disabled all website blocking",
        };
    }
    catch (error) {
        if (error.message.includes("User canceled")) {
            return {
                success: false,
                message: "Authentication was canceled by user",
            };
        }
        return {
            success: false,
            message: `Failed to disable blocking: ${error.message}`,
        };
    }
}
async function checkDomainsBlocked(domains) {
    try {
        const hostsContent = await fs.readFile(HOSTS_FILE_PATH, "utf-8");
        const result = {};
        domains.forEach((domain) => {
            result[domain] = hostsContent.includes(`${REDIRECT_IP} ${domain} ${WEBGLOCKER_TAG}`);
        });
        return result;
    }
    catch (error) {
        console.error("Error checking blocked domains:", error);
        const result = {};
        domains.forEach((domain) => {
            result[domain] = false;
        });
        return result;
    }
}
async function getBlockedDomainsFromHosts() {
    try {
        const hostsContent = await fs.readFile(HOSTS_FILE_PATH, "utf-8");
        const lines = hostsContent.split("\n");
        const blockedDomains = [];
        lines.forEach((line) => {
            if (line.includes(WEBGLOCKER_TAG) && line.includes(REDIRECT_IP)) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 2 && parts[0] === REDIRECT_IP) {
                    blockedDomains.push(parts[1]);
                }
            }
        });
        return blockedDomains;
    }
    catch (error) {
        console.error("Error reading blocked domains from hosts file:", error);
        return [];
    }
}
function clearPasswordSession() {
    const passwordManager = passwordManager_1.default.getInstance();
    passwordManager.clearSession();
}
function getPasswordSessionInfo() {
    const passwordManager = passwordManager_1.default.getInstance();
    return passwordManager.getSessionInfo();
}
//# sourceMappingURL=streamlinedHostsManager.js.map