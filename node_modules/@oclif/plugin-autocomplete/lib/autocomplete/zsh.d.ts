import { Config } from '@oclif/core';
export default class ZshCompWithSpaces {
    protected config: Config;
    private _coTopics?;
    private commands;
    private topics;
    constructor(config: Config);
    private get coTopics();
    generate(): string;
    private genZshFlagArgumentsBlock;
    private genZshTopicCompFun;
    private genZshValuesBlock;
    private getCommands;
    private getTopics;
    private sanitizeSummary;
}
