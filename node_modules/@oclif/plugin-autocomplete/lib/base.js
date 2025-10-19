import { Command } from '@oclif/core';
import { mkdirSync, openSync, writeSync } from 'node:fs';
import path from 'node:path';
export class AutocompleteBase extends Command {
    get acLogfilePath() {
        return path.join(this.config.cacheDir, 'autocomplete.log');
    }
    get autocompleteCacheDir() {
        return path.join(this.config.cacheDir, 'autocomplete');
    }
    get cliBin() {
        return this.config.bin;
    }
    get cliBinEnvVar() {
        return this.config.bin.toUpperCase().replaceAll('-', '_');
    }
    determineShell(shell) {
        if (!shell) {
            this.error('Missing required argument shell');
        }
        else if (this.isBashOnWindows(shell)) {
            return 'bash';
        }
        else {
            return shell;
        }
    }
    getSetupEnvVar(shell) {
        return `${this.cliBinEnvVar}_AC_${shell.toUpperCase()}_SETUP_PATH`;
    }
    writeLogFile(msg) {
        mkdirSync(this.config.cacheDir, { recursive: true });
        const entry = `[${new Date().toISOString()}] ${msg}\n`;
        const fd = openSync(this.acLogfilePath, 'a');
        writeSync(fd, entry);
    }
    isBashOnWindows(shell) {
        return shell.endsWith('\\bash.exe');
    }
}
