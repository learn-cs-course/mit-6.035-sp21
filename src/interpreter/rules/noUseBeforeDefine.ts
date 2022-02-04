/**
 * @file 变量先声明后使用
 */

import {RuleObject} from '../ruleType';
import {SyntaxKind} from '../../types/grammar';

const rule: RuleObject = {
    name: 'noUseBeforeDefine',
    create(context) {
        return {
            [SyntaxKind.Identifier](node) {
                switch (node.parent!.kind) {
                    case SyntaxKind.ImportDeclaration:
                    case SyntaxKind.FieldDeclaration:
                    case SyntaxKind.MethodDeclaration:
                    case SyntaxKind.ArrayDeclaration:
                    case SyntaxKind.Parameter:
                        break;
                    default:
                    {
                        const symbol = context.symbolTable.find(node.name);
                        if (symbol || node.name === 'len') {
                            return;
                        }
                        context.report('identifier used before being declared');
                    }
                }
            },
        };
    },
};

export default rule;
