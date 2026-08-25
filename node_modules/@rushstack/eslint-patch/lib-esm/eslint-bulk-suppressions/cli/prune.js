// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import fs from 'node:fs';
import { printPruneHelp } from './utils/print-help';
import { runEslintAsync } from './runEslint';
import { ESLINT_BULK_PRUNE_ENV_VAR_NAME } from '../constants';
import { deleteBulkSuppressionsFileInEslintConfigFolder, getSuppressionsConfigForEslintConfigFolderPath } from '../bulk-suppressions-file';
export async function pruneAsync() {
    const args = process.argv.slice(3);
    if (args.includes('--help') || args.includes('-h')) {
        printPruneHelp();
        process.exit(0);
    }
    if (args.length > 0) {
        throw new Error(`@rushstack/eslint-bulk: Unknown arguments: ${args.join(' ')}`);
    }
    const normalizedCwd = process.cwd().replace(/\\/g, '/');
    const allFiles = await getAllFilesWithExistingSuppressionsForCwdAsync(normalizedCwd);
    if (allFiles.length > 0) {
        process.env[ESLINT_BULK_PRUNE_ENV_VAR_NAME] = '1';
        console.log(`Pruning suppressions for ${allFiles.length} files...`);
        await runEslintAsync(allFiles, 'prune');
    }
    else {
        console.log('No files with existing suppressions found.');
        deleteBulkSuppressionsFileInEslintConfigFolder(normalizedCwd);
    }
}
async function getAllFilesWithExistingSuppressionsForCwdAsync(normalizedCwd) {
    const { jsonObject: bulkSuppressionsConfigJson } = getSuppressionsConfigForEslintConfigFolderPath(normalizedCwd);
    const allFiles = new Set();
    for (const { file: filePath } of bulkSuppressionsConfigJson.suppressions) {
        allFiles.add(filePath);
    }
    const allFilesArray = Array.from(allFiles);
    const allExistingFiles = [];
    // TODO: limit parallelism here with something similar to `Async.forEachAsync` from `node-core-library`.
    await Promise.all(allFilesArray.map(async (filePath) => {
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            allExistingFiles.push(filePath);
        }
        catch (_a) {
            // Doesn't exist - ignore
        }
    }));
    console.log(`Found ${allExistingFiles.length} files with existing suppressions.`);
    const deletedCount = allFilesArray.length - allExistingFiles.length;
    if (deletedCount > 0) {
        console.log(`${deletedCount} files with suppressions were deleted.`);
    }
    return allExistingFiles;
}
//# sourceMappingURL=prune.js.map