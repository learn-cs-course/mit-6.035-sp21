/**
 * @file main 方法必须存在，且返回值类型为 void
 */

import {RuleObject} from '../ruleType';
import {SyntaxKind} from '../../types/grammar';

const rule: RuleObject = {
    name: 'missingMainMethod',
    create(context) {
        return {
            [SyntaxKind.Program](node) {
                const [mainMethod] = node.methodDeclarations.filter(method => {
                    if (method.name.name === 'main') {
                        return true;
                    }
                    return false;
                });
                if (!mainMethod) {
                    context.report('No main method');
                    return;
                }
                if (mainMethod.returnType !== SyntaxKind.VoidKeyword) {
                    context.report('main method must return void');
                }
                if (mainMethod.parameters.length !== 0) {
                    context.report('main method must not have parameters');
                }
            },
        };
    },
};

export default rule;
