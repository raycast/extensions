"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.template = template;
exports.standardizeIDFromArgv = standardizeIDFromArgv;
exports.getHelpFlagAdditions = getHelpFlagAdditions;
exports.formatFlagDeprecationWarning = formatFlagDeprecationWarning;
exports.formatCommandDeprecationWarning = formatCommandDeprecationWarning;
exports.normalizeArgv = normalizeArgv;
const ejs_1 = __importDefault(require("ejs"));
const util_1 = require("../config/util");
const ids_1 = require("../util/ids");
function template(context) {
    function render(t) {
        return ejs_1.default.render(t, context);
    }
    return render;
}
const isFlag = (s) => s.startsWith('-');
const isArgWithValue = (s) => s.includes('=');
function collateSpacedCmdIDFromArgs(argv, config) {
    if (argv.length === 1)
        return argv;
    const findId = (argv) => {
        const ids = (0, util_1.collectUsableIds)(config.commandIDs);
        const final = [];
        const idPresent = (id) => ids.has(id);
        const finalizeId = (s) => (s ? [...final, s] : final).filter(Boolean).join(':');
        const hasArgs = () => {
            const id = finalizeId();
            if (!id)
                return false;
            const cmd = config.findCommand(id);
            return Boolean(cmd && (cmd.strict === false || Object.keys(cmd.args ?? {}).length > 0));
        };
        for (const arg of argv) {
            if (idPresent(finalizeId(arg)))
                final.push(arg);
            // If the parent topic has a command that expects positional arguments, then we cannot
            // assume that any subsequent string could be part of the command name
            else if (isArgWithValue(arg) || isFlag(arg) || hasArgs())
                break;
            else
                final.push(arg);
        }
        return finalizeId();
    };
    const id = findId(argv);
    if (id) {
        const argvSlice = argv.slice(id.split(':').length);
        return [id, ...argvSlice];
    }
    return argv; // ID is argv[0]
}
function standardizeIDFromArgv(argv, config) {
    if (argv.length === 0)
        return argv;
    if (config.topicSeparator === ' ')
        argv = collateSpacedCmdIDFromArgs(argv, config);
    else if (config.topicSeparator !== ':')
        argv[0] = (0, ids_1.toStandardizedId)(argv[0], config);
    return argv;
}
function getHelpFlagAdditions(config) {
    const helpFlags = ['--help'];
    const additionalHelpFlags = config.pjson.oclif.additionalHelpFlags ?? [];
    return [...new Set([...additionalHelpFlags, ...helpFlags]).values()];
}
function formatFlagDeprecationWarning(flag, opts) {
    let message = `The "${flag}" flag has been deprecated`;
    if (opts === true)
        return `${message}.`;
    if (opts.message)
        return opts.message;
    if (opts.version) {
        message += ` and will be removed in version ${opts.version}`;
    }
    message += opts.to ? `. Use "${opts.to}" instead.` : '.';
    return message;
}
function formatCommandDeprecationWarning(command, opts) {
    let message = `The "${command}" command has been deprecated`;
    if (!opts)
        return `${message}.`;
    if (opts.message)
        return opts.message;
    if (opts.version) {
        message += ` and will be removed in version ${opts.version}`;
    }
    message += opts.to ? `. Use "${opts.to}" instead.` : '.';
    return message;
}
function normalizeArgv(config, argv = process.argv.slice(2)) {
    if (config.topicSeparator !== ':' && !argv[0]?.includes(':'))
        argv = standardizeIDFromArgv(argv, config);
    return argv;
}
