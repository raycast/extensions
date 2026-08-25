// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import fs from 'node:fs';
import os from 'node:os';
import { eslintFolder, eslintPackageVersion } from '../_patch-base';
import { ESLINT_BULK_DETECT_ENV_VAR_NAME, ESLINT_BULK_STDOUT_END_DELIMETER, ESLINT_BULK_STDOUT_START_DELIMETER } from './constants';
import currentPackageJson from '../../package.json';
const CURRENT_PACKAGE_VERSION = currentPackageJson.version;
export function findAndConsoleLogPatchPathCli() {
    const eslintBulkDetectEnvVarValue = process.env[ESLINT_BULK_DETECT_ENV_VAR_NAME];
    if (eslintBulkDetectEnvVarValue !== 'true' && eslintBulkDetectEnvVarValue !== '1') {
        return;
    }
    const configuration = {
        /**
         * `@rushstack/eslint-bulk` should report an error if its package.json is older than this number
         */
        minCliVersion: '0.0.0',
        /**
         * `@rushstack/eslint-bulk` will invoke this entry point
         */
        cliEntryPoint: require.resolve('../exports/eslint-bulk')
    };
    console.log(ESLINT_BULK_STDOUT_START_DELIMETER + JSON.stringify(configuration) + ESLINT_BULK_STDOUT_END_DELIMETER);
}
export function getPathToLinterJS() {
    if (!eslintFolder) {
        throw new Error('Cannot find ESLint installation to patch.');
    }
    return `${eslintFolder}/lib/linter/linter.js`;
}
export function ensurePathToGeneratedPatch() {
    const patchesFolderPath = `${os.tmpdir()}/rushstack-eslint-bulk-${CURRENT_PACKAGE_VERSION}/patches`;
    fs.mkdirSync(patchesFolderPath, { recursive: true });
    const pathToGeneratedPatch = `${patchesFolderPath}/linter-patch-v${eslintPackageVersion}.js`;
    return pathToGeneratedPatch;
}
//# sourceMappingURL=path-utils.js.map