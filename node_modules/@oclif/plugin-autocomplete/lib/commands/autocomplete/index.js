import { Args, Flags, ux } from '@oclif/core';
import { bold, cyan } from 'ansis';
import { EOL } from 'node:os';
import { AutocompleteBase } from '../../base.js';
import Create from './create.js';
export default class Index extends AutocompleteBase {
    static args = {
        shell: Args.string({
            description: 'Shell type',
            options: ['zsh', 'bash', 'powershell'],
            required: false,
        }),
    };
    static description = 'Display autocomplete installation instructions.';
    static examples = [
        '$ <%= config.bin %> autocomplete',
        '$ <%= config.bin %> autocomplete bash',
        '$ <%= config.bin %> autocomplete zsh',
        '$ <%= config.bin %> autocomplete powershell',
        '$ <%= config.bin %> autocomplete --refresh-cache',
    ];
    static flags = {
        'refresh-cache': Flags.boolean({ char: 'r', description: 'Refresh cache (ignores displaying instructions)' }),
    };
    async run() {
        const { args, flags } = await this.parse(Index);
        const shell = args.shell ?? this.determineShell(this.config.shell);
        if (shell === 'powershell' && this.config?.topicSeparator === ':') {
            this.error(`PowerShell completion is not supported in CLIs using colon as the topic separator.${EOL}See: https://oclif.io/docs/topic_separator`);
        }
        ux.action.start(`${bold('Building the autocomplete cache')}`);
        await Create.run([], this.config);
        ux.action.stop();
        if (!flags['refresh-cache']) {
            this.printShellInstructions(shell);
        }
    }
    printShellInstructions(shell) {
        const setupEnvVar = this.getSetupEnvVar(shell);
        const tabStr = shell === 'bash' ? '<TAB><TAB>' : '<TAB>';
        const scriptCommand = `${this.config.bin} autocomplete${this.config.topicSeparator}script ${shell}`;
        let instructions = `
Setup Instructions for ${this.config.bin.toUpperCase()} CLI Autocomplete ---
==============================================
`;
        switch (shell) {
            case 'bash': {
                instructions += `
1) Run this command in your terminal window:

  ${cyan(`printf "$(${scriptCommand})" >> ~/.bashrc; source ~/.bashrc`)}

  The previous command adds the ${cyan(setupEnvVar)} environment variable to your Bash config file and then sources the file.

  ${bold('NOTE')}: If you’ve configured your terminal to start as a login shell, you may need to modify the command so it updates either the ~/.bash_profile or ~/.profile file. For example:

  ${cyan(`printf "$(${scriptCommand})" >> ~/.bash_profile; source ~/.bash_profile`)}

  Or:

  ${cyan(`printf "$(${scriptCommand})" >> ~/.profile; source ~/.profile`)}

2) Start using autocomplete:

  ${cyan(`${this.config.bin} ${tabStr}`)}                  # Command completion
  ${cyan(`${this.config.bin} command --${tabStr}`)}        # Flag completion
  `;
                break;
            }
            case 'powershell': {
                instructions += `
1) Run these two cmdlets in your PowerShell window in the order shown:

  ${cyan(`New-Item -Type Directory -Path (Split-Path -Parent $PROFILE) -ErrorAction SilentlyContinue
  Add-Content -Path $PROFILE -Value (Invoke-Expression -Command "${scriptCommand}"); .$PROFILE`)}

2) (Optional) If you want matching completions printed below the command line, run this cmdlet:

  ${cyan('Set-PSReadlineKeyHandler -Key Tab -Function MenuComplete')}

3) Start using autocomplete:

  ${cyan(`${this.config.bin} ${tabStr}`)}                  # Command completion
  ${cyan(`${this.config.bin} command --${tabStr}`)}        # Flag completion
  `;
                break;
            }
            case 'zsh': {
                instructions += `
1) Run this command in your terminal window:

  ${cyan(`printf "$(${scriptCommand})" >> ~/.zshrc; source ~/.zshrc`)}

  The previous command adds the ${cyan(setupEnvVar)} environment variable to your zsh config file and then sources the file.

2) (Optional) Run this command to ensure that you have no permissions conflicts:

  ${cyan('compaudit -D')}

3) Start using autocomplete:

  ${cyan(`${this.config.bin} ${tabStr}`)}                  # Command completion
  ${cyan(`${this.config.bin} command --${tabStr}`)}        # Flag completion
  `;
                break;
            }
        }
        instructions += `
  Every time you enter ${tabStr}, the autocomplete feature displays a list of commands (or flags if you type --), along with their summaries. Enter a letter and then ${tabStr} again to narrow down the list until you end up with the complete command that you want to execute.

  Enjoy!
`;
        this.log(instructions);
    }
}
