"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultParsing = exports.handleOutput = exports.getSpawnedResult = exports.getSpawnedPromise = void 0;
const node_buffer_1 = require("node:buffer");
const node_stream_1 = __importDefault(require("node:stream"));
const node_util_1 = require("node:util");
const signal_exit_1 = require("signal-exit");
function getSpawnedPromise(spawned, { timeout } = {}) {
    const spawnedPromise = new Promise((resolve, reject) => {
        spawned.on("exit", (exitCode, signal) => {
            resolve({ exitCode, signal, timedOut: false });
        });
        spawned.on("error", (error) => {
            reject(error);
        });
        if (spawned.stdin) {
            spawned.stdin.on("error", (error) => {
                reject(error);
            });
        }
    });
    if (timeout === 0 || timeout === undefined) {
        return spawnedPromise;
    }
    let timeoutId;
    const timeoutPromise = new Promise((_resolve, reject) => {
        timeoutId = setTimeout(() => {
            spawned.kill("SIGTERM");
            reject(Object.assign(new Error("Timed out"), { timedOut: true, signal: "SIGTERM" }));
        }, timeout);
    });
    const safeSpawnedPromise = spawnedPromise.finally(() => {
        clearTimeout(timeoutId);
    });
    const removeExitHandler = (0, signal_exit_1.onExit)(() => {
        spawned.kill();
    });
    return Promise.race([timeoutPromise, safeSpawnedPromise]).finally(() => removeExitHandler());
}
exports.getSpawnedPromise = getSpawnedPromise;
class MaxBufferError extends Error {
    constructor() {
        super("The output is too big");
        this.name = "MaxBufferError";
    }
}
const streamPipelinePromisified = (0, node_util_1.promisify)(node_stream_1.default.pipeline);
function bufferStream(options) {
    const { encoding } = options;
    const isBuffer = encoding === "buffer";
    // @ts-expect-error missing the methods we are adding below
    const stream = new node_stream_1.default.PassThrough({ objectMode: false });
    if (encoding && encoding !== "buffer") {
        stream.setEncoding(encoding);
    }
    let length = 0;
    const chunks = [];
    stream.on("data", (chunk) => {
        chunks.push(chunk);
        length += chunk.length;
    });
    stream.getBufferedValue = () => {
        return (isBuffer ? Buffer.concat(chunks, length) : chunks.join(""));
    };
    stream.getBufferedLength = () => length;
    return stream;
}
async function getStream(inputStream, options) {
    const stream = bufferStream(options);
    await new Promise((resolve, reject) => {
        const rejectPromise = (error) => {
            // Don't retrieve an oversized buffer.
            if (error && stream.getBufferedLength() <= node_buffer_1.constants.MAX_LENGTH) {
                error.bufferedData = stream.getBufferedValue();
            }
            reject(error);
        };
        (async () => {
            try {
                await streamPipelinePromisified(inputStream, stream);
                resolve();
            }
            catch (error) {
                rejectPromise(error);
            }
        })();
        stream.on("data", () => {
            // 80mb
            if (stream.getBufferedLength() > 1000 * 1000 * 80) {
                rejectPromise(new MaxBufferError());
            }
        });
    });
    return stream.getBufferedValue();
}
// On failure, `result.stdout|stderr` should contain the currently buffered stream
async function getBufferedData(stream, streamPromise) {
    stream.destroy();
    try {
        return await streamPromise;
    }
    catch (error) {
        return error.bufferedData;
    }
}
async function getSpawnedResult({ stdout, stderr }, { encoding }, processDone) {
    const stdoutPromise = getStream(stdout, { encoding });
    const stderrPromise = getStream(stderr, { encoding });
    try {
        return await Promise.all([processDone, stdoutPromise, stderrPromise]);
    }
    catch (error) {
        return Promise.all([
            {
                error: error,
                exitCode: null,
                signal: error.signal,
                timedOut: error.timedOut || false,
            },
            getBufferedData(stdout, stdoutPromise),
            getBufferedData(stderr, stderrPromise),
        ]);
    }
}
exports.getSpawnedResult = getSpawnedResult;
function stripFinalNewline(input) {
    const LF = typeof input === "string" ? "\n" : "\n".charCodeAt(0);
    const CR = typeof input === "string" ? "\r" : "\r".charCodeAt(0);
    if (input[input.length - 1] === LF) {
        // @ts-expect-error we are doing some nasty stuff here
        input = input.slice(0, -1);
    }
    if (input[input.length - 1] === CR) {
        // @ts-expect-error we are doing some nasty stuff here
        input = input.slice(0, -1);
    }
    return input;
}
function handleOutput(options, value) {
    if (options.stripFinalNewline) {
        return stripFinalNewline(value);
    }
    return value;
}
exports.handleOutput = handleOutput;
const getErrorPrefix = ({ timedOut, timeout, signal, exitCode, }) => {
    if (timedOut) {
        return `timed out after ${timeout} milliseconds`;
    }
    if (signal !== undefined && signal !== null) {
        return `was killed with ${signal}`;
    }
    if (exitCode !== undefined && exitCode !== null) {
        return `failed with exit code ${exitCode}`;
    }
    return "failed";
};
const makeError = ({ stdout, stderr, error, signal, exitCode, command, timedOut, options, parentError, }) => {
    const prefix = getErrorPrefix({ timedOut, timeout: options?.timeout, signal, exitCode });
    const execaMessage = `Command ${prefix}: ${command}`;
    const shortMessage = error ? `${execaMessage}\n${error.message}` : execaMessage;
    const message = [shortMessage, stderr, stdout].filter(Boolean).join("\n");
    if (error) {
        // @ts-expect-error not on Error
        error.originalMessage = error.message;
    }
    else {
        error = parentError;
    }
    error.message = message;
    // @ts-expect-error not on Error
    error.shortMessage = shortMessage;
    // @ts-expect-error not on Error
    error.command = command;
    // @ts-expect-error not on Error
    error.exitCode = exitCode;
    // @ts-expect-error not on Error
    error.signal = signal;
    // @ts-expect-error not on Error
    error.stdout = stdout;
    // @ts-expect-error not on Error
    error.stderr = stderr;
    if ("bufferedData" in error) {
        delete error["bufferedData"];
    }
    return error;
};
function defaultParsing({ stdout, stderr, error, exitCode, signal, timedOut, command, options, parentError, }) {
    if (error || exitCode !== 0 || signal !== null) {
        const returnedError = makeError({
            error,
            exitCode,
            signal,
            stdout,
            stderr,
            command,
            timedOut,
            options,
            parentError,
        });
        throw returnedError;
    }
    return stdout;
}
exports.defaultParsing = defaultParsing;
