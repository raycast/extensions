import type {ExecFileOptions} from 'node:child_process';

export type ExecutePowerShellOptions = ExecFileOptions & {
	/**
	Path to PowerShell executable.

	@default powerShellPath()
	*/
	readonly powerShellPath?: string;
};

export type ExecutePowerShellResult = {
	readonly stdout: string;
	readonly stderr: string;
};

/**
Get the PowerShell executable path on Windows.

@returns The path to the PowerShell executable.

@example
```
import {powerShellPath} from 'powershell-utils';

const psPath = powerShellPath();
//=> 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
```
*/
export function powerShellPath(): string;

/**
Check if PowerShell is accessible on Windows.

This checks if the PowerShell executable exists and has execute permissions. Useful for detecting restricted environments where PowerShell may be disabled by administrators.

@returns A promise that resolves to true if PowerShell is accessible, false otherwise.

@example
```
import {canAccessPowerShell} from 'powershell-utils';

if (await canAccessPowerShell()) {
	console.log('PowerShell is available');
} else {
	console.log('PowerShell is not accessible');
}
```
*/
export function canAccessPowerShell(): Promise<boolean>;

/**
Execute a PowerShell command.

@param command - The PowerShell command to execute.
@returns A promise that resolves to the command output.

@example
```
import {executePowerShell} from 'powershell-utils';

const {stdout} = await executePowerShell('Get-Process');
console.log(stdout);
```
*/
export function executePowerShell(
	command: string,
	options?: ExecutePowerShellOptions
): Promise<ExecutePowerShellResult>;

export namespace executePowerShell {
	/**
	Standard PowerShell arguments that prefix the encoded command.

	Use these when manually building PowerShell execution arguments for `spawn()`, `execFile()`, etc.

	@example
	```
	import {executePowerShell} from 'powershell-utils';

	const arguments_ = [...executePowerShell.argumentsPrefix, encodedCommand];
	childProcess.spawn(powerShellPath(), arguments_);
	```
	*/
	export const argumentsPrefix: readonly string[];

	/**
	Encode a PowerShell command as Base64 UTF-16LE.

	This encoding prevents shell escaping issues and ensures complex commands with special characters are executed reliably.

	@param command - The PowerShell command to encode.
	@returns Base64-encoded command.

	@example
	```
	import {executePowerShell} from 'powershell-utils';

	const encoded = executePowerShell.encodeCommand('Get-Process');
	```
	*/
	export function encodeCommand(command: string): string;

	/**
	Escape a string argument for use in PowerShell single-quoted strings.

	@param value - The value to escape.
	@returns Escaped and quoted string ready for PowerShell.

	@example
	```
	import {executePowerShell} from 'powershell-utils';

	const escaped = executePowerShell.escapeArgument("it's a test");
	//=> "'it''s a test'"

	// Use in command building
	const command = `Start-Process ${executePowerShell.escapeArgument(appName)}`;
	```
	*/
	export function escapeArgument(value: unknown): string;
}
