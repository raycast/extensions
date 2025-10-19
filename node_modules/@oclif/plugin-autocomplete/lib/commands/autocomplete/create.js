import makeDebug from 'debug';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import bashAutocompleteWithSpaces from '../../autocomplete/bash-spaces.js';
import bashAutocomplete from '../../autocomplete/bash.js';
import PowerShellComp from '../../autocomplete/powershell.js';
import ZshCompWithSpaces from '../../autocomplete/zsh.js';
import { AutocompleteBase } from '../../base.js';
const debug = makeDebug('autocomplete:create');
function sanitizeDescription(description) {
    if (description === undefined) {
        return '';
    }
    return description
        .replaceAll(/(["`])/g, '\\\\\\$1') // backticks and double-quotes require triple-backslashes
        .replaceAll(/([[\]])/g, '\\\\$1') // square brackets require double-backslashes
        .split('\n')[0]; // only use the first line
}
export default class Create extends AutocompleteBase {
    static description = 'create autocomplete setup scripts and completion functions';
    static hidden = true;
    _commands;
    get bashCommandsWithFlagsList() {
        return this.commands
            .map((c) => {
            const publicFlags = this.genCmdPublicFlags(c).trim();
            return `${c.id} ${publicFlags}`;
        })
            .join('\n');
    }
    get bashCompletionFunction() {
        const { cliBin } = this;
        const supportSpaces = this.config.topicSeparator === ' ';
        const bashScript = process.env.OCLIF_AUTOCOMPLETE_TOPIC_SEPARATOR === 'colon' || !supportSpaces
            ? bashAutocomplete
            : bashAutocompleteWithSpaces;
        return (bashScript
            // eslint-disable-next-line unicorn/prefer-spread
            .concat(...(this.config.binAliases?.map((alias) => `complete -F _<CLI_BIN>_autocomplete ${alias}`).join('\n') ?? []))
            .replaceAll('<CLI_BIN>', cliBin)
            .replaceAll('<BASH_COMMANDS_WITH_FLAGS_LIST>', this.bashCommandsWithFlagsList));
    }
    get bashCompletionFunctionPath() {
        // <cachedir>/autocomplete/functions/bash/<bin>.bash
        return path.join(this.bashFunctionsDir, `${this.cliBin}.bash`);
    }
    get bashFunctionsDir() {
        // <cachedir>/autocomplete/functions/bash
        return path.join(this.autocompleteCacheDir, 'functions', 'bash');
    }
    get bashSetupScript() {
        const setup = path.join(this.bashFunctionsDir, `${this.cliBin}.bash`);
        const bin = this.cliBinEnvVar;
        /* eslint-disable-next-line no-useless-escape */
        return `${bin}_AC_BASH_COMPFUNC_PATH=${setup} && test -f \$${bin}_AC_BASH_COMPFUNC_PATH && source \$${bin}_AC_BASH_COMPFUNC_PATH;
`;
    }
    get bashSetupScriptPath() {
        // <cachedir>/autocomplete/bash_setup
        return path.join(this.autocompleteCacheDir, 'bash_setup');
    }
    get commands() {
        if (this._commands)
            return this._commands;
        const cmds = [];
        for (const p of this.config.getPluginsList()) {
            for (const c of p.commands) {
                try {
                    if (c.hidden)
                        continue;
                    const description = sanitizeDescription(c.summary ?? (c.description || ''));
                    const { flags } = c;
                    cmds.push({
                        description,
                        flags,
                        id: c.id,
                    });
                    for (const a of c.aliases) {
                        cmds.push({
                            description,
                            flags,
                            id: a,
                        });
                    }
                }
                catch (error) {
                    debug(`Error creating zsh flag spec for command ${c.id}`);
                    debug(error.message);
                    this.writeLogFile(error.message);
                }
            }
        }
        this._commands = cmds;
        return this._commands;
    }
    get genAllCommandsMetaString() {
        // eslint-disable-next-line no-useless-escape
        return this.commands.map((c) => `\"${c.id.replaceAll(':', '\\:')}:${c.description}\"`).join('\n');
    }
    get genCaseStatementForFlagsMetaString() {
        // command)
        //   _command_flags=(
        //   "--boolean[bool descr]"
        //   "--value=-[value descr]:"
        //   )
        // ;;
        return this.commands
            .map((c) => `${c.id})
  _command_flags=(
    ${this.genZshFlagSpecs(c)}
  )
;;\n`)
            .join('\n');
    }
    get pwshCompletionFunctionPath() {
        // <cachedir>/autocomplete/functions/powershell/<bin>.ps1
        return path.join(this.pwshFunctionsDir, `${this.cliBin}.ps1`);
    }
    get pwshFunctionsDir() {
        // <cachedir>/autocomplete/functions/powershell
        return path.join(this.autocompleteCacheDir, 'functions', 'powershell');
    }
    get zshCompletionFunction() {
        const { cliBin } = this;
        const allCommandsMeta = this.genAllCommandsMetaString;
        const caseStatementForFlagsMeta = this.genCaseStatementForFlagsMetaString;
        return `#compdef ${cliBin}

_${cliBin} () {
  local _command_id=\${words[2]}
  local _cur=\${words[CURRENT]}
  local -a _command_flags=()

  ## public cli commands & flags
  local -a _all_commands=(
${allCommandsMeta}
  )

  _set_flags () {
    case $_command_id in
${caseStatementForFlagsMeta}
    esac
  }
  ## end public cli commands & flags

  _complete_commands () {
    _describe -t all-commands "all commands" _all_commands
  }

  if [ $CURRENT -gt 2 ]; then
    if [[ "$_cur" == -* ]]; then
      _set_flags
    else
      _path_files
    fi
  fi


  _arguments -S '1: :_complete_commands' \\
                $_command_flags
}

_${cliBin}
`;
    }
    get zshCompletionFunctionPath() {
        // <cachedir>/autocomplete/functions/zsh/_<bin>
        return path.join(this.zshFunctionsDir, `_${this.cliBin}`);
    }
    get zshFunctionsDir() {
        // <cachedir>/autocomplete/functions/zsh
        return path.join(this.autocompleteCacheDir, 'functions', 'zsh');
    }
    get zshSetupScript() {
        return `
fpath=(
${this.zshFunctionsDir}
$fpath
);
autoload -Uz compinit;
compinit;\n`;
    }
    get zshSetupScriptPath() {
        // <cachedir>/autocomplete/zsh_setup
        return path.join(this.autocompleteCacheDir, 'zsh_setup');
    }
    async run() {
        // 1. ensure needed dirs
        await this.ensureDirs();
        // 2. save (generated) autocomplete files
        await this.createFiles();
    }
    async createFiles() {
        // zsh
        const supportSpaces = this.config.topicSeparator === ' ';
        await Promise.all([
            writeFile(this.bashSetupScriptPath, this.bashSetupScript),
            writeFile(this.bashCompletionFunctionPath, this.bashCompletionFunction),
            writeFile(this.zshSetupScriptPath, this.zshSetupScript),
            // eslint-disable-next-line unicorn/prefer-spread
        ].concat(process.env.OCLIF_AUTOCOMPLETE_TOPIC_SEPARATOR === 'colon' || !supportSpaces
            ? [writeFile(this.zshCompletionFunctionPath, this.zshCompletionFunction)]
            : [
                writeFile(this.zshCompletionFunctionPath, new ZshCompWithSpaces(this.config).generate()),
                writeFile(this.pwshCompletionFunctionPath, new PowerShellComp(this.config).generate()),
            ]));
    }
    async ensureDirs() {
        // ensure autocomplete cache dir before doing the children
        await mkdir(this.autocompleteCacheDir, { recursive: true });
        await Promise.all([
            mkdir(this.bashFunctionsDir, { recursive: true }),
            mkdir(this.zshFunctionsDir, { recursive: true }),
            mkdir(this.pwshFunctionsDir, { recursive: true }),
        ]);
    }
    genCmdPublicFlags(Command) {
        const Flags = Command.flags || {};
        return Object.keys(Flags)
            .filter((flag) => !Flags[flag].hidden)
            .map((flag) => `--${flag}`)
            .join(' ');
    }
    genZshFlagSpecs(Klass) {
        return Object.keys(Klass.flags || {})
            .filter((flag) => Klass.flags && !Klass.flags[flag].hidden)
            .map((flag) => {
            const f = (Klass.flags && Klass.flags[flag]) || { description: '' };
            const isBoolean = f.type === 'boolean';
            const isOption = f.type === 'option';
            const name = isBoolean ? flag : `${flag}=-`;
            const multiple = isOption && f.multiple ? '*' : '';
            const valueCmpl = isBoolean ? '' : ':';
            const completion = `${multiple}--${name}[${sanitizeDescription(f.summary || f.description)}]${valueCmpl}`;
            return `"${completion}"`;
        })
            .join('\n');
    }
}
