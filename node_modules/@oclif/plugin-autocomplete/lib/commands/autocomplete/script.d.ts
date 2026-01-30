import { AutocompleteBase } from '../../base.js';
export default class Script extends AutocompleteBase {
    static args: {
        shell: import("@oclif/core/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static description: string;
    static hidden: boolean;
    private get prefix();
    private get suffix();
    run(): Promise<void>;
}
