import { Args } from '@oclif/core';
import path from 'node:path';
import { AutocompleteBase } from '../../base.js';
export default class Script extends AutocompleteBase {
    static args = {
        shell: Args.string({
            description: 'Shell type',
            options: ['zsh', 'bash', 'powershell'],
            required: false,
        }),
    };
    static description = 'outputs autocomplete config script for shells';
    static hidden = true;
    get prefix() {
        return '\n';
    }
    get suffix() {
        return ` # ${this.cliBin} autocomplete setup\n`;
    }
    async run() {
        const { args } = await this.parse(Script);
        const shell = args.shell ?? this.config.shell;
        if (shell === 'powershell') {
            const completionFuncPath = path.join(this.config.cacheDir, 'autocomplete', 'functions', 'powershell', `${this.cliBin}.ps1`);
            this.log(`. ${completionFuncPath}`);
        }
        else {
            this.log(`${this.prefix}${this.getSetupEnvVar(shell)}=${path.join(this.autocompleteCacheDir, `${shell}_setup`)} && test -f $${this.getSetupEnvVar(shell)} && source $${this.getSetupEnvVar(shell)};${this.suffix}`);
        }
    }
}
