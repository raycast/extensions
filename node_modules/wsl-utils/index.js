import {promisify} from 'node:util';
import childProcess from 'node:child_process';
import fs, {constants as fsConstants} from 'node:fs/promises';
import isWsl from 'is-wsl';
import {powerShellPath as windowsPowerShellPath, executePowerShell} from 'powershell-utils';
import {parseMountPointFromConfig} from './utilities.js';

const execFile = promisify(childProcess.execFile);

export const wslDrivesMountPoint = (() => {
	// Default value for "root" param
	// according to https://docs.microsoft.com/en-us/windows/wsl/wsl-config
	const defaultMountPoint = '/mnt/';

	let mountPoint;

	return async function () {
		if (mountPoint) {
			// Return memoized mount point value
			return mountPoint;
		}

		const configFilePath = '/etc/wsl.conf';

		let isConfigFileExists = false;
		try {
			await fs.access(configFilePath, fsConstants.F_OK);
			isConfigFileExists = true;
		} catch {}

		if (!isConfigFileExists) {
			return defaultMountPoint;
		}

		const configContent = await fs.readFile(configFilePath, {encoding: 'utf8'});
		const parsedMountPoint = parseMountPointFromConfig(configContent);

		if (parsedMountPoint === undefined) {
			return defaultMountPoint;
		}

		mountPoint = parsedMountPoint;
		mountPoint = mountPoint.endsWith('/') ? mountPoint : `${mountPoint}/`;

		return mountPoint;
	};
})();

export const powerShellPathFromWsl = async () => {
	const mountPoint = await wslDrivesMountPoint();
	return `${mountPoint}c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe`;
};

export const powerShellPath = isWsl ? powerShellPathFromWsl : windowsPowerShellPath;

// Cache for PowerShell accessibility check
let canAccessPowerShellPromise;

export const canAccessPowerShell = async () => {
	canAccessPowerShellPromise ??= (async () => {
		try {
			const psPath = await powerShellPath();
			await fs.access(psPath, fsConstants.X_OK);
			return true;
		} catch {
			// PowerShell is not accessible (either doesn't exist, no execute permission, or other error)
			return false;
		}
	})();

	return canAccessPowerShellPromise;
};

export const wslDefaultBrowser = async () => {
	const psPath = await powerShellPath();
	const command = String.raw`(Get-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\Shell\Associations\UrlAssociations\http\UserChoice").ProgId`;

	const {stdout} = await executePowerShell(command, {powerShellPath: psPath});

	return stdout.trim();
};

const isUrl = path => /^[a-z]+:\/\//i.test(path);

export const convertWslPathToWindows = async paths => {
	const isBatch = Array.isArray(paths);
	const pathArray = isBatch ? paths : [paths];

	// Find indices of non-URL paths that need conversion
	const indicesToConvert = [];
	const pathsToConvert = [];

	for (const [index, path] of pathArray.entries()) {
		if (!isUrl(path)) {
			indicesToConvert.push(index);
			pathsToConvert.push(path);
		}
	}

	// Start with original paths (URLs stay as-is)
	const results = [...pathArray];

	if (pathsToConvert.length > 0) {
		try {
			const {stdout} = await execFile('wslpath', ['-aw', ...pathsToConvert], {encoding: 'utf8'});
			const convertedPaths = stdout.split(/\r?\n/).filter(Boolean);

			for (const [index, originalIndex] of indicesToConvert.entries()) {
				results[originalIndex] = convertedPaths[index] ?? pathArray[originalIndex];
			}
		} catch {
			// If wslpath fails, keep original paths
		}
	}

	return isBatch ? results : results[0];
};

export const isUncPath = path => /^\\\\/u.test(path);

export const isPathOnWindowsFilesystem = async path => {
	const windowsPath = await convertWslPathToWindows(path);
	return !isUncPath(windowsPath);
};

export const convertWindowsPathToWsl = async paths => {
	const isBatch = Array.isArray(paths);
	const pathArray = isBatch ? paths : [paths];

	try {
		const {stdout} = await execFile('wslpath', ['-u', ...pathArray], {encoding: 'utf8'});
		const convertedPaths = stdout.split(/\r?\n/).filter(Boolean);
		const results = pathArray.map((original, index) => convertedPaths[index] ?? original);
		return isBatch ? results : results[0];
	} catch {
		return isBatch ? pathArray : pathArray[0];
	}
};

export {default as isWsl} from 'is-wsl';
