/**
Check if the current environment is Windows Subsystem for Linux (WSL).
*/
export const isWsl: boolean;

/**
Get the PowerShell executable path in WSL environment.
*/
export function powerShellPathFromWsl(): Promise<string>;

/**
Get the PowerShell executable path for the current environment.

Returns WSL path if in WSL, otherwise returns Windows path.
*/
export function powerShellPath(): Promise<string>;

/**
Check if PowerShell is accessible in the current environment.

This is useful to determine whether Windows integration features can be used. In sandboxed WSL environments or systems where PowerShell is not accessible, this will return `false`.

@returns A promise that resolves to `true` if PowerShell is accessible, `false` otherwise.

@example
```
import {canAccessPowerShell} from 'wsl-utils';

if (await canAccessPowerShell()) {
	// Use Windows integration features
	console.log('PowerShell is accessible');
} else {
	// Fall back to Linux-native behavior
	console.log('PowerShell is not accessible');
}
```
*/
export function canAccessPowerShell(): Promise<boolean>;

/**
Get the default browser in WSL.

@returns A promise that resolves to the [ProgID](https://setuserfta.com/guide-to-understanding-progids-and-file-type-associations/) of the default browser (e.g., `'ChromeHTML'`, `'FirefoxURL'`).

@example
```
import {wslDefaultBrowser} from 'wsl-utils';

const progId = await wslDefaultBrowser();
//=> 'ChromeHTML'
```
*/
export function wslDefaultBrowser(): Promise<string>;

/**
Get the mount point for fixed drives in WSL.
*/
export function wslDrivesMountPoint(): Promise<string>;

/**
Convert a WSL Linux path to a Windows-accessible path.

URLs (strings starting with a protocol like `https://`) are returned unchanged.

@param path - The WSL path to convert (e.g., `/home/user/file.html`).
@returns The Windows-accessible path (e.g., `\\wsl.localhost\Ubuntu\home\user\file.html`) or the original path if conversion fails.

@example
```
import {convertWslPathToWindows} from 'wsl-utils';

// Convert a Linux path
const windowsPath = await convertWslPathToWindows('/home/user/file.html');
//=> '\\wsl.localhost\Ubuntu\home\user\file.html'

// URLs are not converted
const url = await convertWslPathToWindows('https://example.com');
//=> 'https://example.com'
```
*/
export function convertWslPathToWindows(path: string): Promise<string>;

/**
Convert multiple WSL Linux paths to Windows-accessible paths.

URLs (strings starting with a protocol like `https://`) are returned unchanged.

@param paths - The WSL paths to convert.
@returns The Windows-accessible paths in the same order, or the original paths if conversion fails.

@example
```
import {convertWslPathToWindows} from 'wsl-utils';

const windowsPaths = await convertWslPathToWindows([
	'/home/user/file.html',
	'/mnt/c/Users/file.txt',
	'https://example.com'
]);
//=> ['\\wsl.localhost\Ubuntu\home\user\file.html', 'C:\Users\file.txt', 'https://example.com']
```
*/
export function convertWslPathToWindows(paths: string[]): Promise<string[]>;

/**
Check if a Windows path is a UNC path (e.g., `\\wsl.localhost\...` or `\\wsl$\...`).

UNC paths indicate the file resides on the WSL Linux filesystem rather than a Windows drive.

@param path - The Windows path to check.
@returns `true` if the path is a UNC path, `false` otherwise.

@example
```
import {isUncPath} from 'wsl-utils';

isUncPath('\\\\wsl.localhost\\Ubuntu\\home\\user');
//=> true

isUncPath('C:\\Users\\file.txt');
//=> false
```
*/
export function isUncPath(path: string): boolean;

/**
Check if a WSL path maps to the Windows filesystem.

This converts the path and checks if it's on a Windows drive (e.g., `/mnt/c/...` → `C:\...`) rather than the Linux filesystem (e.g., `/home/...` → `\\wsl$\...`).

@param path - The WSL path to check.
@returns `true` if the path is on a Windows drive, `false` if it's on the Linux filesystem.

@example
```
import {isPathOnWindowsFilesystem} from 'wsl-utils';

await isPathOnWindowsFilesystem('/mnt/c/Users/file.txt');
//=> true

await isPathOnWindowsFilesystem('/home/user/file.txt');
//=> false
```
*/
export function isPathOnWindowsFilesystem(path: string): Promise<boolean>;

/**
Convert a Windows path to a WSL Linux path.

@param path - The Windows path to convert (e.g., `C:\Users\file.txt`).
@returns The WSL path (e.g., `/mnt/c/Users/file.txt`) or the original path if conversion fails.

@example
```
import {convertWindowsPathToWsl} from 'wsl-utils';

const wslPath = await convertWindowsPathToWsl('C:\\Users\\file.txt');
//=> '/mnt/c/Users/file.txt'
```
*/
export function convertWindowsPathToWsl(path: string): Promise<string>;

/**
Convert multiple Windows paths to WSL Linux paths.

@param paths - The Windows paths to convert.
@returns The WSL paths in the same order, or the original paths if conversion fails.

@example
```
import {convertWindowsPathToWsl} from 'wsl-utils';

const wslPaths = await convertWindowsPathToWsl([
	'C:\\Users\\file.txt',
	'D:\\Projects\\app'
]);
//=> ['/mnt/c/Users/file.txt', '/mnt/d/Projects/app']
```
*/
export function convertWindowsPathToWsl(paths: string[]): Promise<string[]>;
