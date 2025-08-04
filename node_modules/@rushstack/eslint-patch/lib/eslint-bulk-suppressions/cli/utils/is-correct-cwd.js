"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCorrectCwd = isCorrectCwd;
const fs_1 = __importDefault(require("fs"));
function isCorrectCwd(cwd) {
    return (fs_1.default.existsSync(`${cwd}/eslint.config.js`) ||
        fs_1.default.existsSync(`${cwd}/eslint.config.cjs`) ||
        fs_1.default.existsSync(`${cwd}/eslint.config.mjs`) ||
        fs_1.default.existsSync(`${cwd}/.eslintrc.js`) ||
        fs_1.default.existsSync(`${cwd}/.eslintrc.cjs`));
}
//# sourceMappingURL=is-correct-cwd.js.map