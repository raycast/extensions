// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
// This is a workaround for https://github.com/eslint/eslint/issues/3458
//
// To correct how ESLint searches for plugin packages, add this line to the top of your project's .eslintrc.js file:
//
//    require("@rushstack/eslint-patch/modern-module-resolution");
//
import path from 'node:path';
const isModuleResolutionError = (ex) => typeof ex === 'object' && !!ex && 'code' in ex && ex.code === 'MODULE_NOT_FOUND';
const FLAT_CONFIG_REGEX = /eslint\.config\.(cjs|mjs|js)$/i;
// Ex:
//     at async ESLint.lintFiles (C:\\path\\to\\\\eslint\\lib\\eslint\\eslint.js:720:21)
const NODE_STACK_REGEX = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?)(?::(\d+)| (\d+))(?::(\d+))?\)?\s*$/i;
function parseNodeStack(stack) {
    const stackTraceMatch = NODE_STACK_REGEX.exec(stack);
    if (!stackTraceMatch) {
        return undefined;
    }
    return {
        file: stackTraceMatch[2],
        method: stackTraceMatch[1],
        lineNumber: parseInt(stackTraceMatch[3], 10),
        column: stackTraceMatch[4] ? parseInt(stackTraceMatch[4], 10) : undefined
    };
}
function getStackTrace() {
    const stackObj = {};
    const originalStackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = Infinity;
    Error.captureStackTrace(stackObj, getStackTrace);
    Error.stackTraceLimit = originalStackTraceLimit;
    if (!stackObj.stack) {
        throw new Error('Unable to capture stack trace');
    }
    const { stack } = stackObj;
    const stackLines = stack.split('\n');
    const frames = [];
    for (const line of stackLines) {
        const frame = parseNodeStack(line);
        if (frame) {
            frames.push(frame);
        }
    }
    return frames;
}
// Module path for eslintrc.cjs
// Example: ".../@eslint/eslintrc/dist/eslintrc.cjs"
let eslintrcBundlePath = undefined;
// Module path for config-array-factory.js
// Example: ".../@eslint/eslintrc/lib/config-array-factory"
let configArrayFactoryPath = undefined;
// Module path for relative-module-resolver.js
// Example: ".../@eslint/eslintrc/lib/shared/relative-module-resolver"
let moduleResolverPath = undefined;
// Module path for naming.js
// Example: ".../@eslint/eslintrc/lib/shared/naming"
let namingPath = undefined;
// Folder path where ESLint's package.json can be found
// Example: ".../node_modules/eslint"
let eslintFolder = undefined;
// Probe for the ESLint >=9.0.0 flat config layout:
for (let currentModule = module;;) {
    if (FLAT_CONFIG_REGEX.test(currentModule.filename)) {
        // Obtain the stack trace of the current module, since the
        // parent module of a flat config is undefined. From the
        // stack trace, we can find the ESLint folder.
        const stackTrace = getStackTrace();
        const targetFrame = stackTrace.find((frame) => frame.file && frame.file.endsWith('eslint.js'));
        if (targetFrame) {
            // Walk up the path and continuously attempt to resolve the ESLint folder
            let currentPath = targetFrame.file;
            while (currentPath) {
                const potentialPath = path.dirname(currentPath);
                if (potentialPath === currentPath) {
                    break;
                }
                currentPath = potentialPath;
                try {
                    eslintFolder = path.dirname(require.resolve('eslint/package.json', { paths: [currentPath] }));
                    break;
                }
                catch (ex) {
                    if (!isModuleResolutionError(ex)) {
                        throw ex;
                    }
                }
            }
        }
        if (eslintFolder) {
            const eslintrcFolderPath = path.dirname(require.resolve('@eslint/eslintrc/package.json', { paths: [eslintFolder] }));
            eslintrcBundlePath = path.join(eslintrcFolderPath, 'dist/eslintrc.cjs');
        }
        break;
    }
    if (!currentModule.parent) {
        break;
    }
    currentModule = currentModule.parent;
}
if (!eslintFolder) {
    // Probe for the ESLint >=8.0.0 layout:
    for (let currentModule = module;;) {
        if (!eslintrcBundlePath) {
            if (currentModule.filename.endsWith('eslintrc.cjs')) {
                // For ESLint >=8.0.0, all @eslint/eslintrc code is bundled at this path:
                //   .../@eslint/eslintrc/dist/eslintrc.cjs
                try {
                    const eslintrcFolderPath = path.dirname(require.resolve('@eslint/eslintrc/package.json', { paths: [currentModule.path] }));
                    // Make sure we actually resolved the module in our call path
                    // and not some other spurious dependency.
                    const resolvedEslintrcBundlePath = path.join(eslintrcFolderPath, 'dist/eslintrc.cjs');
                    if (resolvedEslintrcBundlePath === currentModule.filename) {
                        eslintrcBundlePath = resolvedEslintrcBundlePath;
                    }
                }
                catch (ex) {
                    // Module resolution failures are expected, as we're walking
                    // up our require stack to look for eslint. All other errors
                    // are re-thrown.
                    if (!isModuleResolutionError(ex)) {
                        throw ex;
                    }
                }
            }
        }
        else {
            // Next look for a file in ESLint's folder
            //   .../eslint/lib/cli-engine/cli-engine.js
            try {
                const eslintCandidateFolder = path.dirname(require.resolve('eslint/package.json', {
                    paths: [currentModule.path]
                }));
                // Make sure we actually resolved the module in our call path
                // and not some other spurious dependency.
                if (currentModule.filename.startsWith(eslintCandidateFolder + path.sep)) {
                    eslintFolder = eslintCandidateFolder;
                    break;
                }
            }
            catch (ex) {
                // Module resolution failures are expected, as we're walking
                // up our require stack to look for eslint. All other errors
                // are re-thrown.
                if (!isModuleResolutionError(ex)) {
                    throw ex;
                }
            }
        }
        if (!currentModule.parent) {
            break;
        }
        currentModule = currentModule.parent;
    }
}
if (!eslintFolder) {
    // Probe for the ESLint >=7.12.0 layout:
    for (let currentModule = module;;) {
        if (!configArrayFactoryPath) {
            // For ESLint >=7.12.0, config-array-factory.js is at this path:
            //   .../@eslint/eslintrc/lib/config-array-factory.js
            try {
                const eslintrcFolder = path.dirname(require.resolve('@eslint/eslintrc/package.json', {
                    paths: [currentModule.path]
                }));
                const resolvedConfigArrayFactoryPath = path.join(eslintrcFolder, '/lib/config-array-factory.js');
                if (resolvedConfigArrayFactoryPath === currentModule.filename) {
                    configArrayFactoryPath = resolvedConfigArrayFactoryPath;
                    moduleResolverPath = `${eslintrcFolder}/lib/shared/relative-module-resolver`;
                    namingPath = `${eslintrcFolder}/lib/shared/naming`;
                }
            }
            catch (ex) {
                // Module resolution failures are expected, as we're walking
                // up our require stack to look for eslint. All other errors
                // are re-thrown.
                if (!isModuleResolutionError(ex)) {
                    throw ex;
                }
            }
        }
        else if (currentModule.filename.endsWith('cli-engine.js')) {
            // Next look for a file in ESLint's folder
            //   .../eslint/lib/cli-engine/cli-engine.js
            try {
                const eslintCandidateFolder = path.dirname(require.resolve('eslint/package.json', {
                    paths: [currentModule.path]
                }));
                if (path.join(eslintCandidateFolder, 'lib/cli-engine/cli-engine.js') === currentModule.filename) {
                    eslintFolder = eslintCandidateFolder;
                    break;
                }
            }
            catch (ex) {
                // Module resolution failures are expected, as we're walking
                // up our require stack to look for eslint. All other errors
                // are rethrown.
                if (!isModuleResolutionError(ex)) {
                    throw ex;
                }
            }
        }
        if (!currentModule.parent) {
            break;
        }
        currentModule = currentModule.parent;
    }
}
if (!eslintFolder) {
    // Probe for the <7.12.0 layout:
    for (let currentModule = module;;) {
        // For ESLint <7.12.0, config-array-factory.js was at this path:
        //   .../eslint/lib/cli-engine/config-array-factory.js
        if (/[\\/]eslint[\\/]lib[\\/]cli-engine[\\/]config-array-factory\.js$/i.test(currentModule.filename)) {
            eslintFolder = path.join(path.dirname(currentModule.filename), '../..');
            configArrayFactoryPath = `${eslintFolder}/lib/cli-engine/config-array-factory`;
            moduleResolverPath = `${eslintFolder}/lib/shared/relative-module-resolver`;
            // The naming module was moved to @eslint/eslintrc in ESLint 7.8.0, which is also when the @eslint/eslintrc
            // package was created and added to ESLint, so we need to probe for whether it's in the old or new location.
            let eslintrcFolder;
            try {
                eslintrcFolder = path.dirname(require.resolve('@eslint/eslintrc/package.json', {
                    paths: [currentModule.path]
                }));
            }
            catch (ex) {
                if (!isModuleResolutionError(ex)) {
                    throw ex;
                }
            }
            namingPath = `${eslintrcFolder !== null && eslintrcFolder !== void 0 ? eslintrcFolder : eslintFolder}/lib/shared/naming`;
            break;
        }
        if (!currentModule.parent) {
            // This was tested with ESLint 6.1.0 .. 7.12.1.
            throw new Error('Failed to patch ESLint because the calling module was not recognized.\n' +
                'If you are using a newer ESLint version that may be unsupported, please create a GitHub issue:\n' +
                'https://github.com/microsoft/rushstack/issues');
        }
        currentModule = currentModule.parent;
    }
}
// Detect the ESLint package version
const eslintPackageJsonPath = `${eslintFolder}/package.json`;
const eslintPackageObject = require(eslintPackageJsonPath);
export const eslintPackageVersion = eslintPackageObject.version;
const ESLINT_MAJOR_VERSION = parseInt(eslintPackageVersion, 10);
if (isNaN(ESLINT_MAJOR_VERSION)) {
    throw new Error(`Unable to parse ESLint version "${eslintPackageVersion}" in file "${eslintPackageJsonPath}"`);
}
if (!(ESLINT_MAJOR_VERSION >= 6 && ESLINT_MAJOR_VERSION <= 9)) {
    throw new Error('The ESLint patch script has only been tested with ESLint version 6.x, 7.x, 8.x, and 9.x.' +
        ` (Your version: ${eslintPackageVersion})\n` +
        'Consider reporting a GitHub issue:\n' +
        'https://github.com/microsoft/rushstack/issues');
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let configArrayFactory;
if (ESLINT_MAJOR_VERSION >= 8 && eslintrcBundlePath) {
    configArrayFactory = require(eslintrcBundlePath).Legacy.ConfigArrayFactory;
}
else if (configArrayFactoryPath) {
    configArrayFactory = require(configArrayFactoryPath).ConfigArrayFactory;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let ModuleResolver;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Naming;
if (ESLINT_MAJOR_VERSION >= 8 && eslintrcBundlePath) {
    ModuleResolver = require(eslintrcBundlePath).Legacy.ModuleResolver;
    Naming = require(eslintrcBundlePath).Legacy.naming;
}
else if (moduleResolverPath && namingPath) {
    ModuleResolver = require(moduleResolverPath);
    Naming = require(namingPath);
}
export { eslintFolder, configArrayFactory, ModuleResolver, Naming, ESLINT_MAJOR_VERSION, isModuleResolutionError };
//# sourceMappingURL=_patch-base.js.map