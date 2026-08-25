import { AutocompleteBase } from '../../base.js';
export default class Create extends AutocompleteBase {
    static description: string;
    static hidden: boolean;
    private _commands?;
    private get bashCommandsWithFlagsList();
    private get bashCompletionFunction();
    private get bashCompletionFunctionPath();
    private get bashFunctionsDir();
    private get bashSetupScript();
    private get bashSetupScriptPath();
    private get commands();
    private get genAllCommandsMetaString();
    private get genCaseStatementForFlagsMetaString();
    private get pwshCompletionFunctionPath();
    private get pwshFunctionsDir();
    private get zshCompletionFunction();
    private get zshCompletionFunctionPath();
    private get zshFunctionsDir();
    private get zshSetupScript();
    private get zshSetupScriptPath();
    run(): Promise<void>;
    private createFiles;
    private ensureDirs;
    private genCmdPublicFlags;
    private genZshFlagSpecs;
}
