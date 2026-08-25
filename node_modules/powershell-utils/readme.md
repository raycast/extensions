# powershell-utils

> Utilities for executing PowerShell commands

## Install

```sh
npm install powershell-utils
```

## Usage

```js
import {executePowerShell, powerShellPath} from 'powershell-utils';

// Execute a PowerShell command
const {stdout} = await executePowerShell('Get-Process');
console.log(stdout);

// Get PowerShell path
console.log(powerShellPath());
//=> 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
```

## API

### powerShellPath()

Returns: `string`

Get the PowerShell executable path on Windows.

```js
import {powerShellPath} from 'powershell-utils';

const psPath = powerShellPath();
//=> 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
```

### canAccessPowerShell()

Returns: `Promise<boolean>`

Check if PowerShell is accessible on Windows.

This checks if the PowerShell executable exists and has execute permissions. Useful for detecting restricted environments where PowerShell may be disabled by administrators.

```js
import {canAccessPowerShell} from 'powershell-utils';

if (await canAccessPowerShell()) {
	console.log('PowerShell is available');
} else {
	console.log('PowerShell is not accessible');
}
```

### executePowerShell(command, options?)

Returns: `Promise<{stdout: string, stderr: string}>`

Execute a PowerShell command.

```js
import {executePowerShell} from 'powershell-utils';

// Execute a PowerShell command
const {stdout} = await executePowerShell('Get-Process');
console.log(stdout);
```

#### command

Type: `string`

The PowerShell command to execute.

#### options

Type: `object`

The below option and also all options in Node.js [`child_process.execFile()`](https://nodejs.org/api/child_process.html#child_processexecfilefile-args-options-callback) are supported.

##### powerShellPath

Type: `string`\
Default: `powerShellPath()`

Path to PowerShell executable. Useful when calling from WSL or when PowerShell is in a non-standard location.

##### encoding

Type: `string`\
Default: `'utf8'`

Character encoding for stdout and stderr.

### executePowerShell.argumentsPrefix

Type: `string[]`

Standard PowerShell arguments that prefix the encoded command.

Use these when manually building PowerShell execution arguments for `spawn()`, `execFile()`, etc.

```js
import {executePowerShell} from 'powershell-utils';

const arguments_ = [...executePowerShell.argumentsPrefix, encodedCommand];
childProcess.spawn(powerShellPath(), arguments_);
```

### executePowerShell.encodeCommand(command)

Returns: `string`

Encode a PowerShell command as Base64 UTF-16LE.

This encoding prevents shell escaping issues and ensures complex commands with special characters are executed reliably.

#### command

Type: `string`

The PowerShell command to encode.

```js
import {executePowerShell} from 'powershell-utils';

const encoded = executePowerShell.encodeCommand('Get-Process');
```

### executePowerShell.escapeArgument(value)

Returns: `string`

Escape a string argument for use in PowerShell single-quoted strings.

#### value

Type: `unknown`

The value to escape.

```js
import {executePowerShell} from 'powershell-utils';

const escaped = executePowerShell.escapeArgument("it's a test");
//=> "'it''s a test'"

// Use in command building
const command = `Start-Process ${executePowerShell.escapeArgument(appName)}`;
```
