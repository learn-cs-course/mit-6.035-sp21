/**
 * @file 变量不得重复声明
 */

import {RuleObject} from '../ruleType';
import {SyntaxKind} from '../../types/grammar';

const rule: RuleObject = {
    name: 'noRedeclare',
    create(context) {
        return {
            [SyntaxKind.ImportDeclaration](node) {
                const name = node.importName.name;
                const symbol = context.symbolTable.findInCurrent(name);
                if (symbol) {
                    context.report(`${name} has been declared`);
                }
            },
            [SyntaxKind.FieldDeclaration](node) {
                node.declarations.forEach(declaration => {
                    const name = declaration.kind === SyntaxKind.Identifier
                        ? declaration.name
                        : declaration.name.name;
                    const symbol = context.symbolTable.findInCurrent(name);
                    if (symbol) {
                        context.report(`${name} has been declared`);
                    }
                });
            },
            [SyntaxKind.MethodDeclaration](node) {
                const name = node.name.name;
                const symbol = context.symbolTable.findInCurrent(name);
                if (symbol) {
                    context.report(`${name} has been declared`);
                }
            },
            [SyntaxKind.Parameter](node) {
                const name = node.name.name;
                const symbol = context.symbolTable.findInCurrent(name);
                if (symbol) {
                    context.report(`${name} has been declared`);
                }
            },
        };
    },
};

export default rule;
