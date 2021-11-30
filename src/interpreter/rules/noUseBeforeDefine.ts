/**
 * @file 变量不得重复声明
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
                        context.report('identifier used before being declared');
                }

            },
        };
    },
};

export default rule;
