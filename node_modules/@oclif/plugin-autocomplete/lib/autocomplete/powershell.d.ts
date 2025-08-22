import { Config } from '@oclif/core';
export default class PowerShellComp {
    protected config: Config;
    private _coTopics?;
    private commands;
    private topics;
    constructor(config: Config);
    private get coTopics();
    generate(): string;
    private genCmdHashtable;
    private genHashtable;
    private getCommands;
    private getTopics;
    private sanitizeSummary;
}
