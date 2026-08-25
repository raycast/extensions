"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPrettyPrintOptions = applyPrettyPrintOptions;
exports.default = prettyPrint;
const indent_string_1 = __importDefault(require("indent-string"));
const wrap_ansi_1 = __importDefault(require("wrap-ansi"));
const screen_1 = require("../../screen");
const settings_1 = require("../../settings");
function applyPrettyPrintOptions(error, options) {
    const prettyErrorKeys = ['message', 'code', 'ref', 'suggestions'];
    for (const key of prettyErrorKeys) {
        const applyOptionsKey = !(key in error) && options[key];
        if (applyOptionsKey) {
            ;
            error[key] = options[key];
        }
    }
    return error;
}
const formatSuggestions = (suggestions) => {
    const label = 'Try this:';
    if (!suggestions || suggestions.length === 0)
        return undefined;
    if (suggestions.length === 1)
        return `${label} ${suggestions[0]}`;
    const multiple = suggestions.map((suggestion) => `* ${suggestion}`).join('\n');
    return `${label}\n${(0, indent_string_1.default)(multiple, 2)}`;
};
function isCombinedErrorType(obj) {
    return Boolean(obj) && 'name' in obj && 'message' in obj;
}
function prettyPrint(error) {
    const prettyPrintedErrors = [];
    let currentError = error;
    let isDeep = false;
    while (isCombinedErrorType(currentError)) {
        if (settings_1.settings.debug && currentError.stack) {
            prettyPrintedErrors.push(`${isDeep ? 'Caused by: ' : ''}${currentError.stack}`);
        }
        else {
            const { bang, code, message, name: errorSuffix, ref, suggestions } = currentError;
            // errorSuffix is pulled from the 'name' property on CLIError
            // and is like either Error or Warning
            const formattedHeader = message ? `${errorSuffix || 'Error'}: ${message}` : undefined;
            const formattedCode = code ? `Code: ${code}` : undefined;
            const formattedSuggestions = formatSuggestions(suggestions);
            const formattedReference = ref ? `Reference: ${ref}` : undefined;
            const formatted = [formattedHeader, formattedCode, formattedSuggestions, formattedReference]
                .filter(Boolean)
                .join('\n');
            let output = `${isDeep ? 'Caused by: ' : ''}${formatted}`;
            output = (0, wrap_ansi_1.default)(output, screen_1.errtermwidth - 6, { hard: true, trim: false });
            if (!settings_1.settings.debug) {
                output = (0, indent_string_1.default)(output, 3);
                output = (0, indent_string_1.default)(output, 1, { includeEmptyLines: true, indent: bang || '' });
                output = (0, indent_string_1.default)(output, 1);
            }
            prettyPrintedErrors.push(output);
        }
        isDeep = true;
        currentError = currentError.cause ?? null;
    }
    return prettyPrintedErrors.join('\n');
}
