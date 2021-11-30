/**
 * @file 数组访问 index 需合法
 */

import {RuleObject} from '../ruleType';
import {Type} from '../../types/grammar';

const rule: RuleObject = {
    name: 'noInvalidArrayIndex',
    create(context) {
        return {
            'ArrayLocation:exit'(node) {
                if (node.index.nodeType !== Type.Int) {
                    context.report('index must be int');
                }
            },
        };
    },
};

export default rule;
