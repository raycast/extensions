import { Command } from '@oclif/core';
export declare abstract class AutocompleteBase extends Command {
    get acLogfilePath(): string;
    get autocompleteCacheDir(): string;
    get cliBin(): string;
    get cliBinEnvVar(): string;
    determineShell(shell: string): string;
    getSetupEnvVar(shell: string): string;
    writeLogFile(msg: string): void;
    private isBashOnWindows;
}
