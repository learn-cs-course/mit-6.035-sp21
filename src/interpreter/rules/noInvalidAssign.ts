/**
 * @file 赋值语句左右类型需合法
 */

import {RuleObject} from '../ruleType';
import {SyntaxKind, Type} from '../../types/grammar';

const rule: RuleObject = {
    name: 'noInvalidArrayIndex',
    create(context) {
        return {
            'AssignmentStatement:exit'(node) {
                const leftNodeType = node.left.nodeType;
                switch (node.operator) {
                    case SyntaxKind.PlusEqualsToken:
                    case SyntaxKind.MinusEqualsToken:
                    {
                        if (leftNodeType !== Type.Int) {
                            context.report('lhs must be int');
                            return;
                        }
                        if (!node.right) {
                            context.report('rhs must exist');
                            return;
                        }
                        const rightNodeType = node.right.nodeType;
                        // 只有 import declaration 会命中这里
                        if (
                            node.right.kind === SyntaxKind.CallExpression
                            && rightNodeType === Type.Unknown
                        ) {
                            return;
                        }
                        if (rightNodeType !== Type.Int) {
                            context.report('rhs must be int');
                        }
                        break;
                    }
                    case SyntaxKind.EqualsToken:
                    {
                        if (!node.right) {
                            context.report('rhs must exist');
                            return;
                        }
                        const rightNodeType = node.right.nodeType;
                        // 只有 import declaration 会命中这里
                        if (
                            node.right.kind === SyntaxKind.CallExpression
                            && rightNodeType === Type.Unknown
                        ) {
                            return;
                        }
                        if (leftNodeType !== rightNodeType) {
                            context.report('lhs and rhs must be same type');
                        }
                        break;
                    }
                    case SyntaxKind.PlusPlusToken:
                    case SyntaxKind.MinusMinusToken:
                    {
                        if (leftNodeType !== Type.Int) {
                            context.report('lhs must be int');
                        }
                        break;
                    }
                    default:
                        throw new Error('unexpected operator');
                }
            },
            'ForInitializer:exit'(node) {
                if (
                    node.declaration.nodeType === Type.Int
                    && node.expression.nodeType === Type.Int
                ) {
                    return;
                }
                context.report('for initializer must be int');
            },
            'ForIncrement:exit'(node) {
                if (node.declaration.nodeType !== Type.Int) {
                    context.report('for increment must be int');
                    return;
                }
                if (node.expression && node.expression.nodeType !== Type.Int) {
                    context.report('for increment must be int');
                }
            },
        };
    },
};

export default rule;
