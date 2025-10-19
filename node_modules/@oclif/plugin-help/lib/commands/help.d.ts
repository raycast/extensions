import { Command } from '@oclif/core';
export default class HelpCommand extends Command {
    static args: {
        command: import("@oclif/core/interfaces").Arg<string | undefined, Record<string, unknown>>;
    };
    static description: string;
    static flags: {
        'nested-commands': import("@oclif/core/interfaces").BooleanFlag<boolean>;
    };
    static strict: boolean;
    run(): Promise<void>;
}
