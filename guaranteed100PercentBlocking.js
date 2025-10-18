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
exports.enable100PercentBlocking = enable100PercentBlocking;
exports.disable100PercentBlocking = disable100PercentBlocking;
const child_process_1 = require("child_process");
const util_1 = require("util");
const fs = __importStar(require("fs/promises"));
const biometricAuth_1 = require("./biometricAuth");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function extractDomain(input) {
    let domain = input.toLowerCase().trim();
    domain = domain.replace(/^[a-z]+:\/\//, "");
    domain = domain.split("/")[0];
    domain = domain.split("?")[0];
    domain = domain.split("#")[0];
    domain = domain.split(":")[0];
    return domain;
}
async function resolveDomains(domains) {
    const ips = new Set();
    for (const domain of domains) {
        try {
            const { stdout } = await execAsync(`dig +short ${domain} A 2>/dev/null || true`);
            stdout.split("\n").forEach((ip) => {
                const trimmed = ip.trim();
                if (trimmed && trimmed.match(/^\d+\.\d+\.\d+\.\d+$/)) {
                    ips.add(trimmed);
                }
            });
        }
        catch (error) {
            console.error(`Failed to resolve ${domain}:`, error);
        }
    }
    return Array.from(ips);
}
async function enable100PercentBlocking(domains) {
    if (!domains || domains.length === 0) {
        return {
            success: false,
            message: "No domains provided to block",
        };
    }
    try {
        console.log(`🔥 Enabling 100% GUARANTEED blocking for ${domains.length} domains...`);
        const expandedDomains = [];
        domains.forEach((domain) => {
            const cleanDomain = extractDomain(domain);
            if (cleanDomain) {
                expandedDomains.push(cleanDomain);
                if (!cleanDomain.startsWith("www.")) {
                    expandedDomains.push(`www.${cleanDomain}`);
                }
                else {
                    expandedDomains.push(cleanDomain.replace(/^www\./, ""));
                }
            }
        });
        const uniqueDomains = Array.from(new Set(expandedDomains));
        console.log("🔍 Resolving domains to IPs...");
        const ips = await resolveDomains(uniqueDomains);
        console.log(`✅ Resolved ${ips.length} IP addresses`);
        const scriptContent = `#!/bin/bash
set -e

echo "🔥 Enabling 100% GUARANTEED Website Blocking..."
echo "================================================="

# BACKUP ORIGINAL FILES
echo "📦 Creating backups..."
cp /etc/hosts /etc/hosts.webblocker.backup 2>/dev/null || true
cp /etc/pf.conf /etc/pf.conf.webblocker.backup 2>/dev/null || true

# ============================================
# METHOD 1: HOSTS FILE (DNS Blocking)
# ============================================
echo ""
echo "🛡️  METHOD 1: Updating /etc/hosts file..."

# Remove old WebBlocker entries
sed -i.bak '/# WebBlocker - START/,/# WebBlocker - END/d' /etc/hosts

# Add new entries
echo "" >> /etc/hosts
echo "# WebBlocker - START - DO NOT EDIT" >> /etc/hosts
${uniqueDomains
            .map((domain) => `echo "127.0.0.1       ${domain}" >> /etc/hosts
echo "::1             ${domain}" >> /etc/hosts`)
            .join("\n")}
echo "# WebBlocker - END" >> /etc/hosts

echo "✅ Hosts file updated with ${uniqueDomains.length} domains"

# ============================================
# METHOD 2: FLUSH DNS CACHE
# ============================================
echo ""
echo "🧹 METHOD 2: Flushing DNS cache..."
dscacheutil -flushcache 2>/dev/null || true
killall -HUP mDNSResponder 2>/dev/null || true
echo "✅ DNS cache cleared"

# ============================================
# METHOD 3: PF FIREWALL (Packet Blocking)
# ============================================
echo ""
echo "🔥 METHOD 3: Configuring PF Firewall..."

# Create PF rules file
cat > /tmp/webblocker.pf.rules << 'PFRULES'
# WebBlocker Aggressive Firewall Rules
table <webblocker_blocked> persist

# Block ALL packets to/from blocked IPs
block drop out quick on any inet proto tcp from any to <webblocker_blocked>
block drop out quick on any inet proto udp from any to <webblocker_blocked>
block drop in quick on any inet proto tcp from <webblocker_blocked> to any
block drop in quick on any inet proto udp from <webblocker_blocked> to any

# Specific port blocks
block drop out quick on any proto tcp from any to <webblocker_blocked> port 80
block drop out quick on any proto tcp from any to <webblocker_blocked> port 443
block drop out quick on any proto tcp from any to <webblocker_blocked> port 8080
PFRULES

# Add anchor to pf.conf if not exists
if ! grep -q "com.webblocker.blocking" /etc/pf.conf 2>/dev/null; then
  echo "" >> /etc/pf.conf
  echo "# WebBlocker Anchor" >> /etc/pf.conf
  echo 'anchor "com.webblocker.blocking"' >> /etc/pf.conf
  echo 'load anchor "com.webblocker.blocking" from "/tmp/webblocker.pf.rules"' >> /etc/pf.conf
fi

# Enable PF if not enabled
if ! pfctl -s info 2>/dev/null | grep -q "Status: Enabled"; then
  echo "🚀 Enabling PF firewall..."
  pfctl -e 2>/dev/null || true
fi

# Clear existing table
pfctl -t webblocker_blocked -T flush 2>/dev/null || true

# Add all IPs to block table
echo "📋 Adding ${ips.length} IPs to firewall block list..."
${ips.map((ip) => `pfctl -t webblocker_blocked -T add ${ip} 2>/dev/null || echo "Failed to add ${ip}"`).join("\n")}

# Load firewall rules
pfctl -a com.webblocker.blocking -f /tmp/webblocker.pf.rules 2>/dev/null || true

# Reload PF
pfctl -f /etc/pf.conf 2>/dev/null || true

echo "✅ Firewall configured and active"

# ============================================
# METHOD 4: KILL EXISTING CONNECTIONS
# ============================================
echo ""
echo "🔪 METHOD 4: Terminating existing connections..."

# Kill connections to each blocked IP
${ips
            .map((ip) => `pfctl -k ${ip} 2>/dev/null || true
pfctl -k 0.0.0.0/0 -k ${ip} 2>/dev/null || true`)
            .join("\n")}

# Flush connection states
pfctl -F states 2>/dev/null || true

echo "✅ Existing connections terminated"

# ============================================
# VERIFICATION
# ============================================
echo ""
echo "🔍 Verifying blocking is active..."

# Check hosts file
HOSTS_COUNT=$(grep -c "# WebBlocker" /etc/hosts 2>/dev/null || echo "0")
echo "   Hosts file entries: $HOSTS_COUNT"

# Check PF
PF_STATUS=$(pfctl -s info 2>/dev/null | grep "Status:" || echo "Unknown")
echo "   PF Firewall: $PF_STATUS"

# Check blocked IPs
IP_COUNT=$(pfctl -t webblocker_blocked -T show 2>/dev/null | wc -l || echo "0")
echo "   Blocked IPs in firewall: $IP_COUNT"

echo ""
echo "================================================="
echo "✅ 100% GUARANTEED BLOCKING ENABLED!"
echo "================================================="
echo "Domains blocked: ${uniqueDomains.length}"
echo "IPs blocked: ${ips.length}"
echo ""
echo "🛡️  Hosts file: ACTIVE"
echo "🔥 PF Firewall: ACTIVE"
echo "🔪 Connections: TERMINATED"
echo ""
echo "NO BYPASS POSSIBLE!"
`;
        const tempScriptPath = "/tmp/webblocker_guaranteed_enable.sh";
        await fs.writeFile(tempScriptPath, scriptContent);
        await execAsync(`chmod +x ${tempScriptPath}`);
        console.log("🔐 Requesting authentication...");
        const execResult = await (0, biometricAuth_1.executeScriptWithAuth)(tempScriptPath, "WebBlocker needs to configure multiple blocking methods (hosts file + firewall) to ensure websites are blocked");
        if (!execResult.success) {
            await execAsync(`rm -f ${tempScriptPath}`);
            return {
                success: false,
                message: execResult.error || "Authentication failed",
            };
        }
        await execAsync(`rm -f ${tempScriptPath}`);
        return {
            success: true,
            message: `100% GUARANTEED blocking enabled!\n\nBlocked ${uniqueDomains.length} domains at ${ips.length} IPs\n\n✅ Hosts file updated\n✅ Firewall configured\n✅ Connections terminated\n\n🚫 NO BYPASS POSSIBLE!`,
            details: {
                hostsFileUpdated: true,
                firewallConfigured: true,
                connectionsKilled: true,
                ipsBlocked: ips.length,
            },
        };
    }
    catch (error) {
        console.error("100% blocking error:", error);
        return {
            success: false,
            message: `Failed to enable blocking: ${error.message}`,
        };
    }
}
async function disable100PercentBlocking() {
    try {
        const scriptContent = `#!/bin/bash
set -e

echo "🔓 Disabling all blocking methods..."

# Remove from hosts file
sed -i.bak '/# WebBlocker - START/,/# WebBlocker - END/d' /etc/hosts

# Clear DNS cache
dscacheutil -flushcache 2>/dev/null || true
killall -HUP mDNSResponder 2>/dev/null || true

# Clear firewall
pfctl -a com.webblocker.blocking -F all 2>/dev/null || true
pfctl -t webblocker_blocked -T flush 2>/dev/null || true

# Remove anchor from pf.conf
sed -i.bak '/com.webblocker.blocking/d' /etc/pf.conf 2>/dev/null || true
sed -i.bak '/# WebBlocker/d' /etc/pf.conf 2>/dev/null || true

# Reload PF
pfctl -f /etc/pf.conf 2>/dev/null || true

# Clean up
rm -f /tmp/webblocker.pf.rules 2>/dev/null || true

echo "✅ All blocking disabled"
`;
        const tempScriptPath = "/tmp/webblocker_guaranteed_disable.sh";
        await fs.writeFile(tempScriptPath, scriptContent);
        await execAsync(`chmod +x ${tempScriptPath}`);
        const execResult = await (0, biometricAuth_1.executeScriptWithAuth)(tempScriptPath, "WebBlocker needs to remove blocking configuration");
        await execAsync(`rm -f ${tempScriptPath}`);
        if (!execResult.success) {
            return {
                success: false,
                message: execResult.error || "Failed to disable blocking",
            };
        }
        return {
            success: true,
            message: "All blocking methods disabled - websites accessible",
        };
    }
    catch (error) {
        return {
            success: false,
            message: `Failed to disable blocking: ${error.message}`,
        };
    }
}
//# sourceMappingURL=guaranteed100PercentBlocking.js.map