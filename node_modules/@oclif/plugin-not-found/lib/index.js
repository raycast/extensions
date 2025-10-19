import { toConfiguredId } from '@oclif/core';
import { cyan, yellow } from 'ansis';
import utils from './utils.js';
const hook = async function (opts) {
    const hiddenCommandIds = new Set(opts.config.commands.filter((c) => c.hidden).map((c) => c.id));
    const commandIDs = [...opts.config.commandIDs, ...opts.config.commands.flatMap((c) => c.aliases)].filter((c) => !hiddenCommandIds.has(c));
    if (commandIDs.length === 0)
        return;
    let binHelp = `${opts.config.bin} help`;
    const idSplit = opts.id.split(':');
    if (opts.config.findTopic(idSplit[0])) {
        // if valid topic, update binHelp with topic
        binHelp = `${binHelp} ${idSplit[0]}`;
    }
    // alter the suggestion in the help scenario so that help is the first command
    // otherwise the user will be presented 'did you mean 'help'?' instead of 'did you mean "help <command>"?'
    let suggestion = /:?help:?/.test(opts.id)
        ? ['help', ...opts.id.split(':').filter((cmd) => cmd !== 'help')].join(':')
        : utils.closest(opts.id, commandIDs);
    const readableSuggestion = toConfiguredId(suggestion, this.config);
    const originalCmd = toConfiguredId(opts.id, this.config);
    this.warn(`${yellow(originalCmd)} is not a ${opts.config.bin} command.`);
    // Skip prompt if not in interactive terminal.
    const response = process.stdin.isTTY === true ? await utils.getConfirmation(readableSuggestion).catch(() => false) : false;
    if (response) {
        // this will split the original command from the suggested replacement, and gather the remaining args as varargs to help with situations like:
        // confit set foo-bar -> confit:set:foo-bar -> config:set:foo-bar -> config:set foo-bar
        let argv = opts.argv?.length ? opts.argv : opts.id.split(':').slice(suggestion.split(':').length);
        if (suggestion.startsWith('help:')) {
            // the args are the command/partial command you need help for (package:version)
            // we created the suggestion variable to start with "help" so slice the first entry
            argv = suggestion.split(':').slice(1);
            // the command is just the word "help"
            suggestion = 'help';
        }
        return this.config.runCommand(suggestion, argv);
    }
    this.error(`Run ${cyan.bold(binHelp)} for a list of available commands.`, { exit: 127 });
};
export default hook;
