/**
 * @file 声明的数组大小必须是正整数
 */

import {RuleObject} from '../ruleType';
import {SyntaxKind} from '../../types/grammar';

const rule: RuleObject = {
    name: 'noBadArraySize',
    create(context) {
        return {
            [SyntaxKind.ArrayDeclaration](node) {
                if (node.size.kind !== SyntaxKind.IntLiteral) {
                    context.report('Array size must be a positive integer.');
                    return;
                }
                const radix = node.size.value.startsWith('0x') ? 16 : 10;
                const value = parseInt(node.size.value, radix);
                // 只检查大于0，不考虑超64位的情况
                if (value > 0) {
                    return;
                }
                context.report('Array size must be a positive integer.');
            },
        };
    },
};

export default rule;
