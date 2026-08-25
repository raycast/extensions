# wsl-utils

> Utilities for working with [Windows Subsystem for Linux (WSL)](https://en.wikipedia.org/wiki/Windows_Subsystem_for_Linux)

## Install

```sh
npm install wsl-utils
```

## Usage

```js
import {isWsl, powerShellPathFromWsl} from 'wsl-utils';

// Check if running in WSL
console.log('Is WSL:', isWsl);

// Get PowerShell path from WSL
console.log('PowerShell path:', await powerShellPathFromWsl());
//=> '/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe'
```

## API

### isWsl

Type: `boolean`

Check if the current environment is Windows Subsystem for Linux (WSL).

### powerShellPathFromWsl()

Returns: `Promise<string>`

Get the PowerShell executable path in WSL environment.

### powerShellPath()

Returns: `Promise<string>`

Get the PowerShell executable path for the current environment.

Returns WSL path if in WSL, otherwise returns Windows path.

### canAccessPowerShell()

Returns: `Promise<boolean>`

Check if PowerShell is accessible in the current environment.

This is useful to determine whether Windows integration features can be used. In sandboxed WSL environments or systems where PowerShell is not accessible, this will return `false`.

```js
import {canAccessPowerShell} from 'wsl-utils';

if (await canAccessPowerShell()) {
	// Use Windows integration features
	console.log('PowerShell is accessible');
} else {
	// Fall back to Linux-native behavior
	console.log('PowerShell is not accessible');
}
```

### wslDefaultBrowser()

Returns: `Promise<string>`

Get the default browser in WSL.

Returns a promise that resolves to the [ProgID](https://setuserfta.com/guide-to-understanding-progids-and-file-type-associations/) of the default browser (e.g., `'ChromeHTML'`, `'FirefoxURL'`).

```js
import {wslDefaultBrowser} from 'wsl-utils';

const progId = await wslDefaultBrowser();
//=> 'ChromeHTML'
```

### wslDrivesMountPoint()

Returns: `Promise<string>`

Get the mount point for fixed drives in WSL.

### convertWslPathToWindows(path)

Returns: `Promise<string>`

Convert a WSL Linux path to a Windows-accessible path.

URLs (strings starting with a protocol like `https://`) are returned unchanged.

```js
import {convertWslPathToWindows} from 'wsl-utils';

// Convert a Linux path
const windowsPath = await convertWslPathToWindows('/home/user/file.html');
//=> '\\wsl.localhost\Ubuntu\home\user\file.html'

// URLs are not converted
const url = await convertWslPathToWindows('https://example.com');
//=> 'https://example.com'
```

#### path

Type: `string`

The WSL path to convert (e.g., `/home/user/file.html`).

### convertWslPathToWindows(paths)

Returns: `Promise<string[]>`

Convert multiple WSL Linux paths to Windows-accessible paths.

```js
import {convertWslPathToWindows} from 'wsl-utils';

const windowsPaths = await convertWslPathToWindows([
	'/home/user/file.html',
	'/mnt/c/Users/file.txt',
	'https://example.com'
]);
//=> ['\\wsl.localhost\Ubuntu\home\user\file.html', 'C:\Users\file.txt', 'https://example.com']
```

#### paths

Type: `string[]`

The WSL paths to convert.

### isUncPath(path)

Returns: `boolean`

Check if a Windows path is a UNC path (e.g., `\\wsl.localhost\...` or `\\wsl$\...`).

UNC paths indicate the file resides on the WSL Linux filesystem rather than a Windows drive.

```js
import {isUncPath} from 'wsl-utils';

isUncPath('\\\\wsl.localhost\\Ubuntu\\home\\user');
//=> true

isUncPath('C:\\Users\\file.txt');
//=> false
```

#### path

Type: `string`

The Windows path to check.

### isPathOnWindowsFilesystem(path)

Returns: `Promise<boolean>`

Check if a WSL path maps to the Windows filesystem.

This converts the path and checks if it's on a Windows drive (e.g., `/mnt/c/...` → `C:\...`) rather than the Linux filesystem (e.g., `/home/...` → `\\wsl$\...`).

```js
import {isPathOnWindowsFilesystem} from 'wsl-utils';

await isPathOnWindowsFilesystem('/mnt/c/Users/file.txt');
//=> true

await isPathOnWindowsFilesystem('/home/user/file.txt');
//=> false
```

#### path

Type: `string`

The WSL path to check.

### convertWindowsPathToWsl(path)

Returns: `Promise<string>`

Convert a Windows path to a WSL Linux path.

```js
import {convertWindowsPathToWsl} from 'wsl-utils';

const wslPath = await convertWindowsPathToWsl('C:\\Users\\file.txt');
//=> '/mnt/c/Users/file.txt'
```

#### path

Type: `string`

The Windows path to convert.

### convertWindowsPathToWsl(paths)

Returns: `Promise<string[]>`

Convert multiple Windows paths to WSL Linux paths.

```js
import {convertWindowsPathToWsl} from 'wsl-utils';

const wslPaths = await convertWindowsPathToWsl([
	'C:\\Users\\file.txt',
	'D:\\Projects\\app'
]);
//=> ['/mnt/c/Users/file.txt', '/mnt/d/Projects/app']
```

#### paths

Type: `string[]`

The Windows paths to convert.
