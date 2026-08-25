import { URL } from 'node:url';
import { Arg, ArgDefinition } from './interfaces/parser';
/**
 * Create a custom arg.
 *
 * @example
 * type Id = string
 * type IdOpts = { startsWith: string; length: number };
 *
 * export const myArg = custom<Id, IdOpts>({
 *   parse: async (input, opts) => {
 *     if (input.startsWith(opts.startsWith) && input.length === opts.length) {
 *       return input
 *     }
 *
 *     throw new Error('Invalid id')
 *   },
 * })
 */
export declare function custom<T = string, P = Record<string, unknown>>(_defaults: Partial<Arg<T, P>>): ArgDefinition<T, P>;
export declare const boolean: ArgDefinition<boolean, Record<string, unknown>>;
export declare const integer: ArgDefinition<number, {
    max?: number;
    min?: number;
}>;
export declare const directory: ArgDefinition<string, {
    exists?: boolean;
}>;
export declare const file: ArgDefinition<string, {
    exists?: boolean;
}>;
/**
 * Initializes a string as a URL. Throws an error
 * if the string is not a valid URL.
 */
export declare const url: ArgDefinition<URL, Record<string, unknown>>;
declare const stringArg: ArgDefinition<string, Record<string, unknown>>;
export { stringArg as string };
type ReadonlyElementOf<T extends ReadonlyArray<unknown>> = T[number];
/**
 * Create an arg that infers the type from the provided options.
 *
 * The provided `options` must be a readonly array in order for type inference to work.
 *
 * @example
 * export default class MyCommand extends Command {
 *   static args = {
 *     stage: Args.option({
 *       options: ['production', 'staging', 'development'] as const,
 *     })(),
 *   }
 * }
 */
export declare function option<T extends readonly string[]>(defaults: Omit<Partial<Arg<ReadonlyElementOf<T>>>, 'default' | 'multiple' | 'required'> & {
    options: T;
}): ArgDefinition<(typeof defaults.options)[number]>;
