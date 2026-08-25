// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
export function isArrayExpression(node) {
    return node.type === 'ArrayExpression';
}
export function isArrowFunctionExpression(node) {
    return node.type === 'ArrowFunctionExpression';
}
/** default parameters */
export function isAssignmentPattern(node) {
    return node.type === 'AssignmentPattern';
}
export function isClassDeclaration(node) {
    return node.type === 'ClassDeclaration';
}
export function isClassExpression(node) {
    return node.type === 'ClassExpression';
}
export function isExportDefaultDeclaration(node) {
    return node.type === 'ExportDefaultDeclaration';
}
export function isExpression(node) {
    return node.type.includes('Expression');
}
export function isFunctionDeclaration(node) {
    return node.type === 'FunctionDeclaration';
}
export function isFunctionExpression(node) {
    return node.type === 'FunctionExpression';
}
export function isIdentifier(node) {
    return node.type === 'Identifier';
}
export function isLiteral(node) {
    return node.type === 'Literal';
}
export function isMethodDefinition(node) {
    return node.type === 'MethodDefinition';
}
export function isObjectExpression(node) {
    return node.type === 'ObjectExpression';
}
export function isPrivateIdentifier(node) {
    return node.type === 'PrivateIdentifier';
}
export function isProperty(node) {
    return node.type === 'Property';
}
export function isPropertyDefinition(node) {
    return node.type === 'PropertyDefinition';
}
export function isTSEnumDeclaration(node) {
    return node.type === 'TSEnumDeclaration';
}
export function isTSInterfaceDeclaration(node) {
    return node.type === 'TSInterfaceDeclaration';
}
export function isTSModuleDeclaration(node) {
    return node.type === 'TSModuleDeclaration';
}
export function isTSQualifiedName(node) {
    return node.type === 'TSQualifiedName';
}
export function isTSTypeAliasDeclaration(node) {
    return node.type === 'TSTypeAliasDeclaration';
}
export function isVariableDeclarator(node) {
    return node.type === 'VariableDeclarator';
}
// Compound Type Guards for @typescript-eslint/types ast-spec compound types
export function isClassDeclarationWithName(node) {
    return isClassDeclaration(node) && node.id !== null;
}
export function isClassPropertyNameNonComputed(node) {
    return isPrivateIdentifier(node) || isPropertyNameNonComputed(node);
}
export function isFunctionDeclarationWithName(node) {
    return isFunctionDeclaration(node) && node.id !== null;
}
export function isNumberLiteral(node) {
    return isLiteral(node) && typeof node.value === 'number';
}
export function isPropertyNameNonComputed(node) {
    return isIdentifier(node) || isNumberLiteral(node) || isStringLiteral(node);
}
export function isStringLiteral(node) {
    return isLiteral(node) && typeof node.value === 'string';
}
export function isClassExpressionWithName(node) {
    return isClassExpression(node) && node.id !== null;
}
export function isFunctionExpressionWithName(node) {
    return isFunctionExpression(node) && node.id !== null;
}
export function isNormalAnonymousExpression(node) {
    const ANONYMOUS_EXPRESSION_GUARDS = [
        isArrowFunctionExpression,
        isClassExpression,
        isFunctionExpression,
        isObjectExpression
    ];
    return ANONYMOUS_EXPRESSION_GUARDS.some((guard) => guard(node));
}
export function isNormalAssignmentPattern(node) {
    return isAssignmentPattern(node) && isIdentifier(node.left);
}
export function isNormalClassPropertyDefinition(node) {
    return (isPropertyDefinition(node) &&
        (isIdentifier(node.key) || isPrivateIdentifier(node.key)) &&
        node.value !== null);
}
export function isNormalMethodDefinition(node) {
    return isMethodDefinition(node) && (isIdentifier(node.key) || isPrivateIdentifier(node.key));
}
export function isNormalObjectProperty(node) {
    return isProperty(node) && (isIdentifier(node.key) || isPrivateIdentifier(node.key));
}
export function isNormalVariableDeclarator(node) {
    return isVariableDeclarator(node) && isIdentifier(node.id) && node.init !== null;
}
export function isNormalAssignmentPatternWithAnonymousExpressionAssigned(node) {
    return isNormalAssignmentPattern(node) && isNormalAnonymousExpression(node.right);
}
export function isNormalVariableDeclaratorWithAnonymousExpressionAssigned(node) {
    return isNormalVariableDeclarator(node) && isNormalAnonymousExpression(node.init);
}
export function isNormalObjectPropertyWithAnonymousExpressionAssigned(node) {
    return isNormalObjectProperty(node) && isNormalAnonymousExpression(node.value);
}
export function isNormalClassPropertyDefinitionWithAnonymousExpressionAssigned(node) {
    return isNormalClassPropertyDefinition(node) && isNormalAnonymousExpression(node.value);
}
export function isNodeWithName(node) {
    return (isClassDeclarationWithName(node) ||
        isFunctionDeclarationWithName(node) ||
        isClassExpressionWithName(node) ||
        isFunctionExpressionWithName(node) ||
        isNormalVariableDeclaratorWithAnonymousExpressionAssigned(node) ||
        isNormalObjectPropertyWithAnonymousExpressionAssigned(node) ||
        isNormalClassPropertyDefinitionWithAnonymousExpressionAssigned(node) ||
        isNormalAssignmentPatternWithAnonymousExpressionAssigned(node) ||
        isNormalMethodDefinition(node) ||
        isTSEnumDeclaration(node) ||
        isTSInterfaceDeclaration(node) ||
        isTSTypeAliasDeclaration(node));
}
//# sourceMappingURL=ast-guards.js.map