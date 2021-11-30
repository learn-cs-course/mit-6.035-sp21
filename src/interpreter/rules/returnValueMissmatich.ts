/**
 * @file 函数 return 的返回值类型需与函数签名匹配
 */

import {RuleObject} from '../ruleType';
import {SyntaxKind, MethodDeclarationNode, BaseNode, Type} from '../../types/grammar';

const rule: RuleObject = {
    name: 'returnValueMissmatich',
    create(context) {
        return {
            'ReturnStatement:exit'(node) {
                let parent: BaseNode = node.parent!;
                while (parent.kind !== SyntaxKind.MethodDeclaration) {
                    if (parent.parent === null) {
                        context.report('return outside of method');
                        return;
                    }
                    parent = parent.parent!;
                }
                const method = parent as MethodDeclarationNode;
                if (node.expression === undefined) {
                    if (method.returnType === SyntaxKind.VoidKeyword) {
                        return;
                    }
                    context.report('return value type mismatch');
                    return;
                }
                const expectedType = method.returnType === SyntaxKind.IntKeyword
                    ? Type.Int
                    : Type.Bool;
                if (expectedType === node.expression.nodeType) {
                    return;
                }
                context.report('return value type mismatch');
            },
        };
    },
};

export default rule;
