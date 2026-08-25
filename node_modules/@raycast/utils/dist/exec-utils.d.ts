/// <reference types="node" />
/// <reference types="node" />
/// <reference types="node" />
import childProcess from "node:child_process";
export type SpawnedPromise = Promise<{
    exitCode: number | null;
    error?: Error;
    signal: NodeJS.Signals | null;
    timedOut: boolean;
}>;
export declare function getSpawnedPromise(spawned: childProcess.ChildProcessWithoutNullStreams, { timeout }?: {
    timeout?: number;
}): SpawnedPromise;
export declare function getSpawnedResult<T extends string | Buffer>({ stdout, stderr }: childProcess.ChildProcessWithoutNullStreams, { encoding }: {
    encoding: BufferEncoding | "buffer";
}, processDone: SpawnedPromise): Promise<[{
    exitCode: number | null;
    error?: Error | undefined;
    signal: NodeJS.Signals | null;
    timedOut: boolean;
}, Awaited<T>, Awaited<T>]>;
export declare function handleOutput<T extends string | Buffer>(options: {
    stripFinalNewline?: boolean;
}, value: T): T;
export type ParseExecOutputHandler<T, DecodedOutput extends string | Buffer = string | Buffer, Options = unknown> = (args: {
    /** The output of the process on stdout. */
    stdout: DecodedOutput;
    /** The output of the process on stderr. */
    stderr: DecodedOutput;
    error?: Error;
    /** The numeric exit code of the process that was run. */
    exitCode: number | null;
    /**
     * The name of the signal that was used to terminate the process. For example, SIGFPE.
     *
     * If a signal terminated the process, this property is defined. Otherwise it is null.
     */
    signal: NodeJS.Signals | null;
    /** Whether the process timed out. */
    timedOut: boolean;
    /** The command that was run, for logging purposes. */
    command: string;
    options?: Options;
}) => T;
export declare function defaultParsing<T extends string | Buffer>({ stdout, stderr, error, exitCode, signal, timedOut, command, options, parentError, }: {
    stdout: T;
    stderr: T;
    error?: Error;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    timedOut: boolean;
    command: string;
    options?: {
        timeout?: number;
    };
    parentError: Error;
}): T;
//# sourceMappingURL=exec-utils.d.ts.map