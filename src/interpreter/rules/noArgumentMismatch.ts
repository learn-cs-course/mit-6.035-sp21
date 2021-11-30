/**
 * @file 函数调用参数不匹配
 */

import {RuleObject} from '../ruleType';
import {SyntaxKind, Type} from '../../types/grammar';

const rule: RuleObject = {
    name: 'noArgumentMismatch',
    create(context) {
        return {
            'CallExpression:exit'(node) {
                const identifierSymbol = context.symbolTable.find(node.callee.name);
                if (identifierSymbol === undefined || identifierSymbol.type !== Type.Method) {
                    context.report('callee should be a method');
                    return;
                }
                const methodDeclaration = identifierSymbol.declaration;
                // 如果是 import 的函数，不进行检查
                if (methodDeclaration.kind === SyntaxKind.ImportDeclaration) {
                    return;
                }

                if (methodDeclaration.kind !== SyntaxKind.MethodDeclaration) {
                    context.report('callee should be a method');
                    return;
                }
                const parameters = methodDeclaration.parameters;
                const calleeArguments = node.arguments;

                if (parameters.length !== calleeArguments.length) {
                    context.report('argument count mismatch');
                    return;
                }

                const allTypeMatch = parameters.every((parameter, index) => {
                    const calleeArgument = calleeArguments[index];
                    return parameter.nodeType === calleeArgument.nodeType
                        && parameter.nodeType !== undefined;
                });

                if (allTypeMatch) {
                    return;
                }
                context.report('argument type mismatch');
            },
        };
    },
};

export default rule;
