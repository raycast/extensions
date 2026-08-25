import { PrettyPrintableError } from '../../interfaces/errors';
type CLIErrorDisplayOptions = {
    bang?: string | undefined;
    name?: string | undefined;
};
export declare function applyPrettyPrintOptions(error: Error, options: PrettyPrintableError): PrettyPrintableError;
type CombinedErrorType = Error & PrettyPrintableError & CLIErrorDisplayOptions;
export default function prettyPrint(error: CombinedErrorType): string | undefined;
export {};
