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
exports.verifyBlockingStatus = verifyBlockingStatus;
exports.getActiveBlockedDomainsCount = getActiveBlockedDomainsCount;
exports.syncBlockingStatus = syncBlockingStatus;
const fs = __importStar(require("fs/promises"));
const HOSTS_FILE_PATH = "/etc/hosts";
const WEBGLOCKER_TAG = "# WebBlocker";
async function verifyBlockingStatus() {
    try {
        const hostsContent = await fs.readFile(HOSTS_FILE_PATH, "utf-8");
        const lines = hostsContent.split("\n");
        const hasBlockerEntries = lines.some((line) => line.includes(WEBGLOCKER_TAG) && line.trim().startsWith("127.0.0.1"));
        return hasBlockerEntries;
    }
    catch (error) {
        console.error("Error verifying blocking status:", error);
        return false;
    }
}
async function getActiveBlockedDomainsCount() {
    try {
        const hostsContent = await fs.readFile(HOSTS_FILE_PATH, "utf-8");
        const lines = hostsContent.split("\n");
        const blockedDomains = lines.filter((line) => line.includes(WEBGLOCKER_TAG) && line.trim().startsWith("127.0.0.1"));
        return blockedDomains.length;
    }
    catch (error) {
        console.error("Error getting blocked domains count:", error);
        return 0;
    }
}
async function syncBlockingStatus() {
    const actualStatus = await verifyBlockingStatus();
    const { setBlockingStatus } = await Promise.resolve().then(() => __importStar(require("./storage")));
    await setBlockingStatus(actualStatus);
    return actualStatus;
}
//# sourceMappingURL=statusVerifier.js.map