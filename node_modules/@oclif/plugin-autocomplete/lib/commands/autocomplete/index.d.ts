import { AutocompleteBase } from '../../base.js';
export default class Index extends AutocompleteBase {
    static args: {
        shell: import("@oclif/core/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static description: string;
    static examples: string[];
    static flags: {
        'refresh-cache': import("@oclif/core/interfaces").BooleanFlag<boolean>;
    };
    run(): Promise<void>;
    private printShellInstructions;
}
