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
Object.defineProperty(exports, "__esModule", { value: true });
exports.enableEnhancedBlocking = exports.enableBlocking = void 0;
exports.safeEnableBlocking = safeEnableBlocking;
const fs = __importStar(require("fs/promises"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const browserRefresher_1 = require("./browserRefresher");
const biometricAuth_1 = require("./biometricAuth");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const HOSTS_FILE_PATH = "/etc/hosts";
const BACKUP_FILE_PATH = "/etc/hosts.backup.webblocker";
const REDIRECT_IP = "127.0.0.1";
const WEBLOCKER_TAG = "# WebBlocker";
function extractDomain(input) {
    let domain = input.toLowerCase().trim();
    domain = domain.replace(/^[a-z]+:\/\//, "");
    domain = domain.split("/")[0];
    domain = domain.split("?")[0];
    domain = domain.split("#")[0];
    domain = domain.split(":")[0];
    return domain;
}
async function createSafeBlockingScript(domains) {
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
        .map((domain) => `echo "${REDIRECT_IP} ${domain} ${WEBLOCKER_TAG}" >> "${HOSTS_FILE_PATH}"`)
        .join("\n");
    return `#!/bin/bash
# Safe WebBlocker Script - Guaranteed to work

echo "🚫 Starting website blocking..."

# 1. Create backup
if [ ! -f "${BACKUP_FILE_PATH}" ]; then
    cp "${HOSTS_FILE_PATH}" "${BACKUP_FILE_PATH}" || true
fi

# 2. Add blocking entries to hosts file
echo "📝 Adding ${uniqueDomains.length} domain(s) to hosts file..."
echo "" >> "${HOSTS_FILE_PATH}"
echo "# WebBlocker - Added by Raycast WebBlocker Extension" >> "${HOSTS_FILE_PATH}"
${domainEntries}

# 3. Clear DNS caches (multiple rounds)
echo "🧹 Clearing DNS caches..."
dscacheutil -flushcache 2>/dev/null || true
killall -HUP mDNSResponder 2>/dev/null || true
sleep 1
dscacheutil -flushcache 2>/dev/null || true

# 4. Restart DNS resolver
echo "🔄 Restarting DNS resolver..."
launchctl kickstart -k system/com.apple.mDNSResponder 2>/dev/null || true
sleep 1

# 5. Final DNS flush
dscacheutil -flushcache 2>/dev/null || true
killall -HUP mDNSResponder 2>/dev/null || true

echo "🎉 Blocking enabled successfully!"
echo "Blocked domains: ${domains.join(", ")}"
`;
}
async function safeEnableBlocking(domains) {
    if (!domains || domains.length === 0) {
        return {
            success: false,
            message: "No domains provided to block",
        };
    }
    try {
        console.log("🚀 Starting safe blocking process...");
        console.log(`🚫 Closing tabs for ${domains.length} blocked domain(s)...`);
        await (0, browserRefresher_1.closeBlockedTabs)(domains).catch((err) => {
            console.error("Error closing tabs:", err);
        });
        await new Promise((resolve) => setTimeout(resolve, 300));
        console.log("📝 Creating blocking script...");
        const scriptContent = await createSafeBlockingScript(domains);
        const tempScriptPath = "/tmp/webblocker_safe.sh";
        await fs.writeFile(tempScriptPath, scriptContent);
        await execAsync(`chmod +x ${tempScriptPath}`);
        console.log("🔐 Requesting Touch ID/password...");
        const result = await (0, biometricAuth_1.executeScriptWithAuth)(tempScriptPath, "WebBlocker needs to modify system files to block websites");
        if (!result.success) {
            await execAsync(`rm -f ${tempScriptPath}`);
            return {
                success: false,
                message: result.error || "Authentication failed",
            };
        }
        console.log("✅ Blocking applied successfully!");
        await execAsync(`rm -f ${tempScriptPath}`);
        console.log("🔄 Final DNS cache clear...");
        await execAsync("dscacheutil -flushcache").catch(() => { });
        return {
            success: true,
            message: `✅ Successfully blocked ${domains.length} website(s)!`,
        };
    }
    catch (error) {
        console.error("Error in safeEnableBlocking:", error);
        if (error.message?.includes("User canceled")) {
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
exports.enableBlocking = safeEnableBlocking;
exports.enableEnhancedBlocking = safeEnableBlocking;
//# sourceMappingURL=safeEnhancedHostsManager.js.map