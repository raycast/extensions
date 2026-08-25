import { Constraint, FlagGroup, FlagOutput, MultiFlagTester, SingleFlagTester } from './interfaces/parser';
import { Validation } from './parser/errors';
/**
 * Establish a constraint on a single flag.
 *
 * @example
 * flag('foo').is.requiredAny()
 *
 * @param flagName The flag to constrain
 */
export declare function flag(flagName: string): ConstraintImpl;
/**
 * Establish a constraint on multiple flags.
 *
 * @example
 * flags('foo', 'bar').are.mutuallyExclusive()
 *
 * @param flagNames The flags to constrain
 */
export declare function flags(...flagNames: string[]): ConstraintImpl;
/**
 * Declare a set of flags to be evaluated as one instead of separately.
 *
 * @example
 * flag('foo').is.dependentOn(combinationOf('bar', 'baz'))
 *
 * @param flagNames Flags to be combined
 */
export declare function combinationOf(...flagNames: string[]): FlagGroup;
declare class ConstraintImpl implements Constraint {
    /**
     * No-op chain property allowing constraints to be more human-readable.
     *
     * @example
     * flags('foo', 'bar').are.mutuallyExclusive()
     */
    readonly are: ConstraintImpl;
    /**
     * No-op chain property allowing constraints to be more human-readable.
     *
     * @example
     * flag('foo').is.dependentOn('bar')
     */
    readonly is: ConstraintImpl;
    private readonly constrainedFlags;
    private constraintApplicatorFunctionHolder;
    private topLevelCondition;
    private underConstructionCondition;
    constructor(constrainedFlags: string[]);
    /**
     * Chain property allowing constraint conditions to be combined with logical AND.
     *
     * By default, logical operators are evaluated left-to-right, but groups can be created with additional {@code when}/{@code unless} clauses.
     *
     * @example <caption> when someFn returns true AND someOtherFn returns true, using --foo requires --bar to be used as well.</caption>
     * flag('foo').is.dependentOn('bar').when.thisIsTrue(someFn).and.thisIsTrue(someOtherFn)
     *
     * @example <caption>--foo requires --bar when (fnA returns true AND fnB returns true) OR fnC returns true</caption>
     * flag('foo').is.dependentOn('bar').when.thisIsTrue(fnA).and.thisIsTrue(fnB).or.thisIsTrue(fnC)
     *
     * @example <caption>--foo requires --bar when fnA returns true AND (fnB returns true OR fnC returns true)</caption>
     * flag('foo').is.dependentOn('bar').when.thisIsTrue(fnA).and.when.thisIsTrue(fnB).or.thisIsTrue(fnC)
     */
    get and(): ConstraintImpl;
    /**
     * Chain property allowing constraint conditions to be combined with logical OR.
     *
     * By default, logical operators are evaluated left-to-right, but groups can be created with additional {@code when}/{@code unless} clauses.
     *
     * @example <caption> when EITHER someFn OR someOtherFn return true, using --foo requires --bar to be used as well.</caption>
     * flag('foo').is.dependentOn('bar').when.thisIsTrue(someFn).or.thisIsTrue(someOtherFn)
     *
     * @example <caption>--foo requires --bar when (fnA returns true AND fnB returns true) OR fnC returns true</caption>
     * flag('foo').is.dependentOn('bar').when.thisIsTrue(fnA).and.thisIsTrue(fnB).or.thisIsTrue(fnC)
     *
     * @example <caption>--foo requires --bar when fnA returns true AND (fnB returns true OR fnC returns true)</caption>
     * flag('foo').is.dependentOn('bar').when.thisIsTrue(fnA).and.when.thisIsTrue(fnB).or.thisIsTrue(fnC)
     *
     */
    get or(): ConstraintImpl;
    /**
     * Chain property allowing constraints to be conditional upon a certain criterion NOT being met.
     *
     * @example
     * flag('foo').is.dependentOn('bar').unless.thisIsTrue(someFn)
     */
    get unless(): ConstraintImpl;
    /**
     * Chain property allowing constraints to be conditional upon a certain criterion being met.
     *
     * @example
     * flag('foo').is.dependentOn('bar').when.thisIsTrue(someFn)
     */
    get when(): ConstraintImpl;
    _evaluateAgainstFlags(flags: FlagOutput): Validation;
    /**
     * Chain method allowing constraint to be made conditional upon EVERY established criterion being true.
     *
     * @example <caption>If --flagA is 'someVal' AND --flagB is 'someOtherVal', then using --foo requires using --bar too</caption>
     * flag('foo').is.dependentOn('bar').when.allFlagCriteriaSatisfied({
     *     flagA: (v) => v === 'someVal',
     *     flagB: (v) => v !== 'someOtherVal'
     * })
     *
     * @param criterionTester An object whose keys are flag names and whose values are functions that accept the
     * value of that flag and return a boolean.
     */
    allFlagCriteriaSatisfied(criterionTester: SingleFlagTester): ConstraintImpl;
    /**
     * Chain method allowing constraint to be made conditional upon ANY established criterion being true.
     *
     * @example <caption>If --flagA is 'someVal' OR --flagB is 'someOtherVal', then using --foo requires using --bar too</caption>
     * flag('foo').is.dependentOn('bar').when.anyFlagCriterionSatisfied({
     *     flagA: (v) => v === 'someVal',
     *     flagB: (v) => v !== 'someOtherVal'
     * })
     *
     * @param criterionTester An object whose keys are flag names and whose values are functions that accept the
     * value of that flag and return a boolean.
     */
    anyFlagCriterionSatisfied(criterionTester: SingleFlagTester): ConstraintImpl;
    /**
     * Chain method allowing the constrained flags to require the presence of at least one of the flags specified here.
     *
     * @example <caption>If --foo is used, then EITHER --bar OR --baz must be used as well</caption>
     * flag('foo').is.dependentOn('bar', 'baz')
     *
     * @example <caption>If --foo is used, then BOTH --bar AND --baz must be used as well</caption>
     * flag('foo').is.dependentOn(combinationOf('bar', 'baz'))
     *
     * @example <caption>If --foo is used, then EITHER --bar OR the combination of --baz1 and --baz2 must be used as well</caption>
     * flag('foo').is.dependentOn('bar', combinationOf('baz1', 'baz2'))
     *
     * @param dependencyFlagGroups
     */
    dependentOn(...dependencyFlagGroups: FlagGroup[]): ConstraintImpl;
    /**
     * Chain method allowing the constrained flags to be made exclusive with the flags provided here.
     *
     * @example <caption>Neither --foo1 nor --foo2 can be used with --bar OR --baz</caption>
     * flags('foo1', 'foo2').are.exclusiveWith('bar', 'baz')
     *
     * @example <caption>Neither --foo1 nor --foo2 can be used with the combination of --bar and --baz, but may be used with --bar or --baz separately</caption>
     * flags('foo1', 'foo2').are.exclusiveWith(combinationOf('bar', 'baz'))
     *
     * @example <caption>Neither --foo1 nor --foo2 can be used with --bar, or with the combination of --baz1 and --baz2</caption>
     * flags('foo1', 'foo2').are.exclusiveWith('bar', combinationOf('baz1', 'baz2'))
     *
     * @param exclusionFlagGroups
     */
    exclusiveWith(...exclusionFlagGroups: FlagGroup[]): ConstraintImpl;
    /**
     * Establish a group of flags as mutually dependent, meaning that they must either be used together or not at all.
     *
     * @example <caption>--foo cannot be used without --bar, and vice versa</caption>
     * flags('foo', 'bar').are.mutuallyDependent()
     */
    mutuallyDependent(): ConstraintImpl;
    /**
     * Establish a group of flags as mutually exclusive, meaning that at most one of them can be used simultaneously.
     *
     * @example <caption>--foo and --bar cannot both be used at the same time</caption>
     * flags('foo', 'bar').are.mutuallyExclusive()
     */
    mutuallyExclusive(): ConstraintImpl;
    /**
     * Establish a group of flags as being collectively required.
     *
     * @example <caption>--foo and --bar are both always required</caption>
     * flags('foo', 'bar').are.requiredAll()
     */
    requiredAll(): ConstraintImpl;
    /**
     * Establish that at least one of the constrained flags must always be used.
     *
     * @example <caption>Must use at least one of --foo, --bar, or --baz</caption>
     * flags('foo', 'bar', 'baz').are.requiredAny()
     */
    requiredAny(): ConstraintImpl;
    /**
     * Establish that at least N of the specified flags must be used.
     *
     * @example <caption>At least 2 of the 3 flags --foo, --bar, and --baz must be used</caption>
     * flags('foo', 'bar', 'baz').are.requiredAtLeastN(2)
     *
     * @param n
     */
    requiredAtLeastN(n: number): ConstraintImpl;
    /**
     * Establish that at most N of the specified flags must be used.
     *
     * @example <caption>No more than 2 of the 3 flags --foo, --bar, and --baz may be used</caption>
     * flags('foo', 'bar', 'baz').are.requiredAtMostN(2)
     *
     * @param n
     */
    requiredAtMostN(n: number): ConstraintImpl;
    /**
     * Establish that exactly N of the specified flags must be used.
     *
     * @example <caption>Exactly 2 of the 3 flags --foo, --bar, and --baz must be used</caption>
     * flags('foo', 'bar', 'baz').are.requiredExactlyN(2)
     *
     * @param n
     */
    requiredExactlyN(n: number): ConstraintImpl;
    /**
     * Chain method allowing the constraint to be made contingent on the return of a method that accepts all flags.
     *
     * @example <caption>--foo1 and --foo2 are required if --bar is equal to --baz</caption>
     * flags('foo1', 'foo2').are.requiredAll().when.thisIsTrue((flags) => flags.bar === flags.baz)
     *
     * @param flagTester A method that accepts the flag values mapped by their name, and returns a boolean
     */
    thisIsTrue(flagTester: MultiFlagTester): ConstraintImpl;
}
export {};
