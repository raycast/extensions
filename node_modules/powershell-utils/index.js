import process from 'node:process';
import {Buffer} from 'node:buffer';
import {promisify} from 'node:util';
import childProcess from 'node:child_process';
import fs, {constants as fsConstants} from 'node:fs/promises';

const execFile = promisify(childProcess.execFile);

export const powerShellPath = () => `${process.env.SYSTEMROOT || process.env.windir || String.raw`C:\Windows`}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;

// Cache for PowerShell accessibility check
let canAccessCache;

export const canAccessPowerShell = async () => {
	canAccessCache ??= (async () => {
		try {
			await fs.access(powerShellPath(), fsConstants.X_OK);
			return true;
		} catch {
			return false;
		}
	})();

	return canAccessCache;
};

export const executePowerShell = async (command, options = {}) => {
	const {
		powerShellPath: psPath,
		...execFileOptions
	} = options;

	const encodedCommand = executePowerShell.encodeCommand(command);

	return execFile(
		psPath ?? powerShellPath(),
		[
			...executePowerShell.argumentsPrefix,
			encodedCommand,
		],
		{
			encoding: 'utf8',
			...execFileOptions,
		},
	);
};

executePowerShell.argumentsPrefix = [
	'-NoProfile',
	'-NonInteractive',
	'-ExecutionPolicy',
	'Bypass',
	'-EncodedCommand',
];

executePowerShell.encodeCommand = command => Buffer.from(command, 'utf16le').toString('base64');

executePowerShell.escapeArgument = value => `'${String(value).replaceAll('\'', '\'\'')}'`;
