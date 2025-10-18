"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.showLongHUD = showLongHUD;
const api_1 = require("@raycast/api");
async function showLongHUD(message, durationMs = 3000) {
    await (0, api_1.showHUD)(message);
    await new Promise((resolve) => setTimeout(resolve, durationMs));
}
//# sourceMappingURL=hudHelper.js.map