// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { getEslintPathAndVersion } from './utils/get-eslint-cli';
export async function runEslintAsync(files, mode) {
    const cwd = process.cwd();
    const [eslintPath, eslintVersion] = getEslintPathAndVersion(cwd);
    const { ESLint } = require(eslintPath);
    let eslint;
    const majorVersion = parseInt(eslintVersion, 10);
    if (majorVersion < 9) {
        eslint = new ESLint({ cwd, useEslintrc: true });
    }
    else {
        eslint = new ESLint({ cwd });
    }
    let results;
    try {
        results = await eslint.lintFiles(files);
    }
    catch (e) {
        throw new Error(`@rushstack/eslint-bulk execution error: ${e.message}`);
    }
    const { write, prune } = await import('../bulk-suppressions-patch');
    switch (mode) {
        case 'suppress': {
            await write();
            break;
        }
        case 'prune': {
            await prune();
            break;
        }
    }
    if (results.length > 0) {
        const stylishFormatter = await eslint.loadFormatter();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedResults = await Promise.resolve(stylishFormatter.format(results));
        console.log(formattedResults);
    }
    console.log('@rushstack/eslint-bulk: Successfully pruned unused suppressions in all .eslint-bulk-suppressions.json ' +
        `files under directory ${cwd}`);
}
//# sourceMappingURL=runEslint.js.map