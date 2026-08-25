"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flag = flag;
exports.flags = flags;
exports.combinationOf = combinationOf;
/**
 * Establish a constraint on a single flag.
 *
 * @example
 * flag('foo').is.requiredAny()
 *
 * @param flagName The flag to constrain
 */
function flag(flagName) {
    return new ConstraintImpl([flagName]);
}
/**
 * Establish a constraint on multiple flags.
 *
 * @example
 * flags('foo', 'bar').are.mutuallyExclusive()
 *
 * @param flagNames The flags to constrain
 */
function flags(...flagNames) {
    return new ConstraintImpl(flagNames);
}
/**
 * Declare a set of flags to be evaluated as one instead of separately.
 *
 * @example
 * flag('foo').is.dependentOn(combinationOf('bar', 'baz'))
 *
 * @param flagNames Flags to be combined
 */
function combinationOf(...flagNames) {
    return {
        flags: flagNames,
        type: 'all',
    };
}
class ConstraintImpl {
    /**
     * No-op chain property allowing constraints to be more human-readable.
     *
     * @example
     * flags('foo', 'bar').are.mutuallyExclusive()
     */
    are = this;
    /**
     * No-op chain property allowing constraints to be more human-readable.
     *
     * @example
     * flag('foo').is.dependentOn('bar')
     */
    is = this;
    constrainedFlags;
    constraintApplicatorFunctionHolder = new ConstraintApplicatorFunctionHolder();
    topLevelCondition;
    underConstructionCondition;
    constructor(constrainedFlags) {
        this.constrainedFlags = constrainedFlags;
    }
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
    get and() {
        if (this.topLevelCondition === undefined) {
            throw new Error(`Misconfigured constraint on ${createFlagString(this.constrainedFlags)}: 'and' requires a 'when' or 'unless'.`);
        }
        if (this.underConstructionCondition) {
            throw new Error(`Misconfigured constraint on ${createFlagString(this.constrainedFlags)}: 'and' cannot directly follow '${this.underConstructionCondition.getName()}'`);
        }
        this.topLevelCondition = new AndCondition(this.topLevelCondition);
        this.underConstructionCondition = this.topLevelCondition;
        return this;
    }
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
    get or() {
        if (this.topLevelCondition === undefined) {
            throw new Error(`Misconfigured constraint on ${createFlagString(this.constrainedFlags)}: 'or' requires a 'when' or 'unless'.`);
        }
        if (this.underConstructionCondition) {
            throw new Error(`Misconfigured constraint on ${createFlagString(this.constrainedFlags)}: 'or' cannot directly follow '${this.underConstructionCondition.getName()}'`);
        }
        this.topLevelCondition = new OrCondition(this.topLevelCondition);
        this.underConstructionCondition = this.topLevelCondition;
        return this;
    }
    /**
     * Chain property allowing constraints to be conditional upon a certain criterion NOT being met.
     *
     * @example
     * flag('foo').is.dependentOn('bar').unless.thisIsTrue(someFn)
     */
    get unless() {
        const newUnless = new UnlessCondition();
        if (this.topLevelCondition === undefined) {
            this.topLevelCondition = newUnless;
        }
        // istanbul ignore else - All cases covered
        if (this.underConstructionCondition === undefined) {
            this.underConstructionCondition = newUnless;
        }
        else if (this.underConstructionCondition instanceof UnaryOpCondition) {
            this.underConstructionCondition.setCondition(newUnless);
            this.underConstructionCondition = newUnless;
        }
        else if (this.underConstructionCondition instanceof BinaryCondition) {
            this.underConstructionCondition.setRight(newUnless);
            this.underConstructionCondition = newUnless;
        }
        else {
            throw new TypeError('UNKNOWN CONDITION TYPE');
        }
        return this;
    }
    /**
     * Chain property allowing constraints to be conditional upon a certain criterion being met.
     *
     * @example
     * flag('foo').is.dependentOn('bar').when.thisIsTrue(someFn)
     */
    get when() {
        const newWhen = new WhenCondition();
        if (this.topLevelCondition === undefined) {
            this.topLevelCondition = newWhen;
        }
        // istanbul ignore else - All cases covered
        if (this.underConstructionCondition === undefined) {
            this.underConstructionCondition = newWhen;
        }
        else if (this.underConstructionCondition instanceof UnaryOpCondition) {
            this.underConstructionCondition.setCondition(newWhen);
            this.underConstructionCondition = newWhen;
        }
        else if (this.underConstructionCondition instanceof BinaryCondition) {
            this.underConstructionCondition.setRight(newWhen);
            this.underConstructionCondition = newWhen;
        }
        else {
            throw new TypeError('UNKNOWN CONDITION TYPE');
        }
        return this;
    }
    _evaluateAgainstFlags(flags) {
        let conditionSatisfied = false;
        try {
            conditionSatisfied = this.topLevelCondition ? this.topLevelCondition.isSatisfied(flags) : true;
        }
        catch (error) {
            return {
                name: this.constrainedFlags.join(','),
                reason: `Error evaluating constraint conditions on ${createFlagString(this.constrainedFlags)}: ${error.message}`,
                status: 'failed',
                validationFn: 'constraintCondition',
            };
        }
        try {
            const applicationResult = this.constraintApplicatorFunctionHolder.applyConstraintApplicatorFunction(flags);
            return {
                name: this.constrainedFlags.join(','),
                reason: applicationResult,
                status: conditionSatisfied && applicationResult !== '' ? 'failed' : 'success',
                validationFn: this.constraintApplicatorFunctionHolder.constraintType ?? '',
            };
        }
        catch (error) {
            // istanbul ignore next
            return {
                name: this.constrainedFlags.join(','),
                reason: `Error evaluating constraint on ${createFlagString(this.constrainedFlags)}: ${error.message}`,
                status: 'failed',
                validationFn: 'constraintApplication',
            };
        }
    }
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
    allFlagCriteriaSatisfied(criterionTester) {
        // istanbul ignore else - All cases covered
        if (this.underConstructionCondition === undefined) {
            throw new Error(`Misconfigured constraint condition on ${createFlagString(this.constrainedFlags)}: allFlagCriteriaSatisfied must immediately follow a when/unless/and/or`);
        }
        else if (this.underConstructionCondition instanceof UnaryOpCondition) {
            this.underConstructionCondition.setCondition(new AllFlagCriteriaSatisfiedCondition(criterionTester));
            this.underConstructionCondition = undefined;
        }
        else if (this.underConstructionCondition instanceof BinaryCondition) {
            this.underConstructionCondition.setRight(new AllFlagCriteriaSatisfiedCondition(criterionTester));
            this.underConstructionCondition = undefined;
        }
        else {
            throw new TypeError('UNKNOWN CONDITION TYPE');
        }
        return this;
    }
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
    anyFlagCriterionSatisfied(criterionTester) {
        // istanbul ignore else - All cases covered
        if (this.underConstructionCondition === undefined) {
            throw new Error(`Misconfigured constraint condition on ${createFlagString(this.constrainedFlags)}: anyFlagCriterionSatisfied must immediately follow a when/unless/and/or`);
        }
        else if (this.underConstructionCondition instanceof UnaryOpCondition) {
            this.underConstructionCondition.setCondition(new AnyFlagCriterionSatisfiedCondition(criterionTester));
            this.underConstructionCondition = undefined;
        }
        else if (this.underConstructionCondition instanceof BinaryCondition) {
            this.underConstructionCondition.setRight(new AnyFlagCriterionSatisfiedCondition(criterionTester));
            this.underConstructionCondition = undefined;
        }
        else {
            throw new TypeError('UNKNOWN CONDITION TYPE');
        }
        return this;
    }
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
    dependentOn(...dependencyFlagGroups) {
        this.constraintApplicatorFunctionHolder.setConstraintApplicator('dependentOn', (flags) => {
            const foundConstraintFlags = filterFlagsPresentInInput(this.constrainedFlags, flags);
            if (foundConstraintFlags.length === 0) {
                return '';
            }
            for (const dependencyFlagGroup of dependencyFlagGroups) {
                if (typeof dependencyFlagGroup === 'string') {
                    if (dependencyFlagGroup in flags && flags[dependencyFlagGroup] !== undefined) {
                        return '';
                    }
                }
                else {
                    const foundFlagsInDependencyGroup = filterFlagsPresentInInput(dependencyFlagGroup.flags, flags);
                    if (foundFlagsInDependencyGroup.length === dependencyFlagGroup.flags.length) {
                        return '';
                    }
                }
            }
            const multipleConstrainedFlags = this.constrainedFlags.length > 1;
            const header = multipleConstrainedFlags
                ? `Flags ${createFlagString(this.constrainedFlags)} require`
                : `Flag ${createFlagString(this.constrainedFlags)} requires`;
            return `${header} at least one of the following${this.topLevelCondition ? ' under current circumstances:' : ':'} ${createFlagString(dependencyFlagGroups)}.`;
        });
        return this;
    }
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
    exclusiveWith(...exclusionFlagGroups) {
        this.constraintApplicatorFunctionHolder.setConstraintApplicator('exclusiveWith', (flags) => {
            const foundConstraintFlags = filterFlagsPresentInInput(this.constrainedFlags, flags);
            if (foundConstraintFlags.length === 0) {
                return '';
            }
            let exclusionGroupFound = false;
            for (const exclusionFlagGroup of exclusionFlagGroups) {
                if (typeof exclusionFlagGroup === 'string') {
                    if (exclusionFlagGroup in flags && flags[exclusionFlagGroup] !== undefined) {
                        exclusionGroupFound = true;
                        break;
                    }
                }
                else {
                    const foundFlagsInExclusionGroup = filterFlagsPresentInInput(exclusionFlagGroup.flags, flags);
                    if (foundFlagsInExclusionGroup.length === exclusionFlagGroup.flags.length) {
                        exclusionGroupFound = true;
                        break;
                    }
                }
            }
            if (!exclusionGroupFound) {
                return '';
            }
            const multipleConstrainedFlags = this.constrainedFlags.length > 1;
            const header = multipleConstrainedFlags ? 'Flags' : 'Flag';
            return `${header} ${createFlagString(this.constrainedFlags)} cannot be used with any of the following${this.topLevelCondition ? ' under current circumstances:' : ':'} ${createFlagString(exclusionFlagGroups)}.`;
        });
        return this;
    }
    /**
     * Establish a group of flags as mutually dependent, meaning that they must either be used together or not at all.
     *
     * @example <caption>--foo cannot be used without --bar, and vice versa</caption>
     * flags('foo', 'bar').are.mutuallyDependent()
     */
    mutuallyDependent() {
        this.constraintApplicatorFunctionHolder.setConstraintApplicator('mutuallyDependent', (flags) => {
            const foundFlags = filterFlagsPresentInInput(this.constrainedFlags, flags);
            if (foundFlags.length === 0 || foundFlags.length === this.constrainedFlags.length) {
                return '';
            }
            return `The following flags are mutually dependent${this.topLevelCondition ? ' under current circumstances:' : ':'} ${createFlagString(this.constrainedFlags)}. Found only ${createFlagString(foundFlags)}.`;
        });
        return this;
    }
    /**
     * Establish a group of flags as mutually exclusive, meaning that at most one of them can be used simultaneously.
     *
     * @example <caption>--foo and --bar cannot both be used at the same time</caption>
     * flags('foo', 'bar').are.mutuallyExclusive()
     */
    mutuallyExclusive() {
        this.constraintApplicatorFunctionHolder.setConstraintApplicator('mutuallyExclusive', (flags) => {
            const foundFlags = filterFlagsPresentInInput(this.constrainedFlags, flags);
            if (foundFlags.length <= 1) {
                return '';
            }
            return `The following flags are mutually exclusive${this.topLevelCondition ? ' under current circumstances:' : ':'} ${createFlagString(this.constrainedFlags)}. Found: ${createFlagString(foundFlags)}.`;
        });
        return this;
    }
    /**
     * Establish a group of flags as being collectively required.
     *
     * @example <caption>--foo and --bar are both always required</caption>
     * flags('foo', 'bar').are.requiredAll()
     */
    requiredAll() {
        this.constraintApplicatorFunctionHolder.setConstraintApplicator('requiredAll', (flags) => {
            const foundFlags = filterFlagsPresentInInput(this.constrainedFlags, flags);
            if (foundFlags.length === this.constrainedFlags.length) {
                return '';
            }
            const requirement = this.constrainedFlags.length > 1 ? 'These flags are required' : 'This flag is required';
            const findings = foundFlags.length > 0 ? `Found only: ${createFlagString(foundFlags)}.` : 'Found none.';
            return `${requirement}${this.topLevelCondition ? ' under current circumstances:' : ':'} ${createFlagString(this.constrainedFlags)}. ${findings}`;
        });
        return this;
    }
    /**
     * Establish that at least one of the constrained flags must always be used.
     *
     * @example <caption>Must use at least one of --foo, --bar, or --baz</caption>
     * flags('foo', 'bar', 'baz').are.requiredAny()
     */
    requiredAny() {
        this.constraintApplicatorFunctionHolder.setConstraintApplicator('requiredAny', (flags) => {
            const foundFlags = filterFlagsPresentInInput(this.constrainedFlags, flags);
            if (foundFlags.length > 0) {
                return '';
            }
            return `Must provide at least one of these flags${this.topLevelCondition ? ' under current circumstances:' : ':'} ${createFlagString(this.constrainedFlags)}.`;
        });
        return this;
    }
    /**
     * Establish that at least N of the specified flags must be used.
     *
     * @example <caption>At least 2 of the 3 flags --foo, --bar, and --baz must be used</caption>
     * flags('foo', 'bar', 'baz').are.requiredAtLeastN(2)
     *
     * @param n
     */
    requiredAtLeastN(n) {
        this.constraintApplicatorFunctionHolder.setConstraintApplicator(`requiredAtLeast${n}`, (flags) => required(n, 'AT_LEAST_N', this.constrainedFlags, flags, this.topLevelCondition !== undefined));
        return this;
    }
    /**
     * Establish that at most N of the specified flags must be used.
     *
     * @example <caption>No more than 2 of the 3 flags --foo, --bar, and --baz may be used</caption>
     * flags('foo', 'bar', 'baz').are.requiredAtMostN(2)
     *
     * @param n
     */
    requiredAtMostN(n) {
        this.constraintApplicatorFunctionHolder.setConstraintApplicator(`requiredAtMost${n}`, (flags) => required(n, 'AT_MOST_N', this.constrainedFlags, flags, this.topLevelCondition !== undefined));
        return this;
    }
    /**
     * Establish that exactly N of the specified flags must be used.
     *
     * @example <caption>Exactly 2 of the 3 flags --foo, --bar, and --baz must be used</caption>
     * flags('foo', 'bar', 'baz').are.requiredExactlyN(2)
     *
     * @param n
     */
    requiredExactlyN(n) {
        this.constraintApplicatorFunctionHolder.setConstraintApplicator(`requiredExactly${n}`, (flags) => required(n, 'EXACTLY_N', this.constrainedFlags, flags, this.topLevelCondition !== undefined));
        return this;
    }
    /**
     * Chain method allowing the constraint to be made contingent on the return of a method that accepts all flags.
     *
     * @example <caption>--foo1 and --foo2 are required if --bar is equal to --baz</caption>
     * flags('foo1', 'foo2').are.requiredAll().when.thisIsTrue((flags) => flags.bar === flags.baz)
     *
     * @param flagTester A method that accepts the flag values mapped by their name, and returns a boolean
     */
    thisIsTrue(flagTester) {
        // istanbul ignore else - All cases covered
        if (this.underConstructionCondition === undefined) {
            throw new Error(`Misconfigured constraint condition on ${createFlagString(this.constrainedFlags)}: thisIsTrue must immediately follow a when/unless/and/or`);
        }
        else if (this.underConstructionCondition instanceof UnaryOpCondition) {
            this.underConstructionCondition.setCondition(new ThisIsTrueCondition(flagTester));
            this.underConstructionCondition = undefined;
        }
        else if (this.underConstructionCondition instanceof BinaryCondition) {
            this.underConstructionCondition.setRight(new ThisIsTrueCondition(flagTester));
            this.underConstructionCondition = undefined;
        }
        else {
            throw new TypeError('UNKNOWN CONDITION TYPE');
        }
        return this;
    }
}
class ConstraintApplicatorFunctionHolder {
    constraintType;
    constraintApplicatorFunction;
    applyConstraintApplicatorFunction(flags) {
        return (this.constraintApplicatorFunction ??
            function () {
                return '';
            })(flags);
    }
    setConstraintApplicator(constraintType, constraintFunction) {
        if (this.constraintApplicatorFunction) {
            // This error is meant to be seen by the developer of the command, not its user.
            throw new Error(`Misconfigured Constraint: Cannot apply multiple kinds of constraint within one statement: ${this.constraintType}, ${constraintType}. Use multiple constraint expressions instead.`);
        }
        this.constraintType = constraintType;
        this.constraintApplicatorFunction = constraintFunction;
    }
}
const Requirement = {
    AT_LEAST_N: {
        fn: (n, other) => other >= n,
        label: 'at least',
    },
    AT_MOST_N: {
        fn: (n, other) => other <= n,
        label: 'at most',
    },
    EXACTLY_N: {
        fn: (n, other) => other === n,
        label: 'exactly',
    },
};
function required(n, requirementType, soughtFlags, providedFlags, hasConditions) {
    const foundFlags = filterFlagsPresentInInput(soughtFlags, providedFlags);
    if (Requirement[requirementType].fn(n, foundFlags.length)) {
        return '';
    }
    return `Must provide ${Requirement[requirementType].label} ${n} of the following${hasConditions ? ' under current circumstances:' : ':'} ${createFlagString(soughtFlags)}. Found ${foundFlags.length}.`;
}
function filterFlagsPresentInInput(flagsToSeek, flags) {
    return flagsToSeek.filter((f) => f in flags && flags[f] !== undefined);
}
function createFlagString(flags) {
    const processedGroups = flags.map((f) => {
        if (typeof f === 'string') {
            return `--${f}`;
        }
        return `combination of ${f.flags.map((f) => `--${f}`).join(' and ')}`;
    });
    return processedGroups.join(', ');
}
class Condition {
}
class UnaryOpCondition extends Condition {
    condition;
    setCondition(condition) {
        // istanbul ignore if - should be unreachable
        if (this.condition) {
            throw new Error(`Duplicate conditions applied to '${this.getName()}' clause: '${this.condition.getName()}' and '${condition.getName()}'.`);
        }
        this.condition = condition;
    }
}
class WhenCondition extends UnaryOpCondition {
    getName() {
        return 'when';
    }
    isSatisfied(flags) {
        if (this.condition) {
            return this.condition.isSatisfied(flags);
        }
        throw new Error("'when' expression without any conditions");
    }
}
class UnlessCondition extends UnaryOpCondition {
    getName() {
        return 'unless';
    }
    isSatisfied(flags) {
        if (this.condition) {
            return !this.condition.isSatisfied(flags);
        }
        throw new Error("'unless' expression without any conditions");
    }
}
class AllFlagCriteriaSatisfiedCondition extends Condition {
    tester;
    constructor(tester) {
        super();
        this.tester = tester;
    }
    getName() {
        return 'allFlagCriteriaSatisfied';
    }
    isSatisfied(flags) {
        for (const testedFlag of Object.keys(this.tester)) {
            if (!this.tester[testedFlag](flags[testedFlag])) {
                return false;
            }
        }
        return true;
    }
}
class AnyFlagCriterionSatisfiedCondition extends Condition {
    tester;
    constructor(tester) {
        super();
        this.tester = tester;
    }
    getName() {
        return 'anyFlagCriterionSatisfied';
    }
    isSatisfied(flags) {
        for (const testedFlag of Object.keys(this.tester)) {
            if (this.tester[testedFlag](flags[testedFlag])) {
                return true;
            }
        }
        return false;
    }
}
class ThisIsTrueCondition extends Condition {
    tester;
    constructor(tester) {
        super();
        this.tester = tester;
    }
    getName() {
        return 'thisIsTrue';
    }
    isSatisfied(flags) {
        return this.tester(flags);
    }
}
class BinaryCondition extends Condition {
    left;
    right;
    constructor(left) {
        super();
        this.left = left;
    }
    setRight(right) {
        this.right = right;
    }
}
class AndCondition extends BinaryCondition {
    getName() {
        return 'and';
    }
    isSatisfied(flags) {
        return this.left.isSatisfied(flags) && (this.right ? this.right.isSatisfied(flags) : true);
    }
}
class OrCondition extends BinaryCondition {
    getName() {
        return 'or';
    }
    isSatisfied(flags) {
        return this.left.isSatisfied(flags) || (this.right ? this.right.isSatisfied(flags) : false);
    }
}
