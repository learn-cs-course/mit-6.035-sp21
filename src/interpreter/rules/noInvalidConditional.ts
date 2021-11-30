/**
 * @file 条件判断需要返回 bool 类型
 */

import {RuleObject} from '../ruleType';
import {Type} from '../../types/grammar';

const rule: RuleObject = {
    name: 'noInvalidConditional',
    create(context) {
        return {
            'IfStatement:exit'(node) {
                if (node.condition.nodeType !== Type.Bool) {
                    context.report('condition must be bool');
                }
            },
            'ForStatement:exit'(node) {
                if (node.condition.nodeType !== Type.Bool) {
                    context.report('condition must be bool');
                }
            },
            'WhileStatement:exit'(node) {
                if (node.condition.nodeType !== Type.Bool) {
                    context.report('condition must be bool');
                }
            },
        };
    },
};

export default rule;
