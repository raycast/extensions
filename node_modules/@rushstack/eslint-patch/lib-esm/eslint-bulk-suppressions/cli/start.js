// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { pruneAsync } from './prune';
import { suppressAsync } from './suppress';
import { isCorrectCwd } from './utils/is-correct-cwd';
import { printHelp } from './utils/print-help';
if (process.argv.includes('-h') || process.argv.includes('-H') || process.argv.includes('--help')) {
    printHelp();
    process.exit(0);
}
if (process.argv.length < 3) {
    printHelp();
    process.exit(1);
}
if (!isCorrectCwd(process.cwd())) {
    console.error('@rushstack/eslint-bulk: Please call this command from the directory that contains .eslintrc.js or .eslintrc.cjs');
    process.exit(1);
}
const subcommand = process.argv[2];
let processPromise;
switch (subcommand) {
    case 'suppress': {
        processPromise = suppressAsync();
        break;
    }
    case 'prune': {
        processPromise = pruneAsync();
        break;
    }
    default: {
        console.error('@rushstack/eslint-bulk: Unknown subcommand: ' + subcommand);
        process.exit(1);
    }
}
processPromise.catch((e) => {
    if (e instanceof Error) {
        console.error(e.message);
        process.exit(1);
    }
    throw e;
});
//# sourceMappingURL=start.js.map