"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class PasswordManager {
    constructor() {
        this.session = null;
        this.SESSION_DURATION = 30 * 60 * 1000;
    }
    static getInstance() {
        if (!PasswordManager.instance) {
            PasswordManager.instance = new PasswordManager();
        }
        return PasswordManager.instance;
    }
    async ensurePassword() {
        if (this.isSessionValid()) {
            return;
        }
        this.session = null;
        try {
            await execAsync("osascript -e 'do shell script \"sudo -v\" with administrator privileges'");
            this.session = {
                hashedPassword: this.generateSessionId(),
                expiryTime: Date.now() + this.SESSION_DURATION,
                sessionId: this.generateSessionId(),
            };
            console.log("Password session established");
        }
        catch (error) {
            if (error.message.includes("User canceled")) {
                throw new Error("Authentication was canceled by user");
            }
            throw new Error("Authentication failed");
        }
    }
    async executeWithCachedAuth(command) {
        await this.ensurePassword();
        try {
            const escapedCommand = command.replace(/'/g, "'\\\\\"'\\\\\"'");
            const applescriptCmd = `osascript -e 'do shell script "${escapedCommand}" with administrator privileges'`;
            const { stdout } = await execAsync(applescriptCmd);
            return stdout.trim();
        }
        catch (error) {
            if (error.message.includes("User canceled")) {
                throw new Error("Authentication was canceled by user");
            }
            throw error;
        }
    }
    isSessionValid() {
        if (!this.session) {
            return false;
        }
        if (Date.now() > this.session.expiryTime) {
            this.session = null;
            return false;
        }
        return true;
    }
    generateSessionId() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    clearSession() {
        this.session = null;
        try {
            execAsync("sudo -k");
        }
        catch (error) {
        }
    }
    getSessionInfo() {
        if (!this.session) {
            return { isValid: false };
        }
        const expiresIn = this.session.expiryTime - Date.now();
        return {
            isValid: expiresIn > 0,
            expiresIn: Math.max(0, Math.floor(expiresIn / 1000)),
        };
    }
}
exports.default = PasswordManager;
//# sourceMappingURL=passwordManager.js.map