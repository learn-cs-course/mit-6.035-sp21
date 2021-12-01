/**
 * @file continue 和 break 需要在循环中使用
 */

import {RuleObject} from '../ruleType';
import {ContinueStatementNode, BreakStatementNode, BaseNode, Type, SyntaxKind} from '../../types/grammar';

const rule: RuleObject = {
    name: 'noInvalidContinueAndBreak',
    create(context) {

        function isNodeInLoop(node: ContinueStatementNode | BreakStatementNode) {
            let parent: BaseNode | undefined = node.parent;
            while (parent !== undefined) {
                if (parent.kind === SyntaxKind.WhileStatement || parent.kind === SyntaxKind.ForStatement) {
                    return true;
                }
                parent = parent.parent;
            }
            if (parent === undefined) {
                context.report('continue and break must be in a loop');
            }
        }

        return {
            ContinueStatement(node) {
                isNodeInLoop(node);
            },
            BreakStatement(node) {
                isNodeInLoop(node);
            },
        };
    },
};

export default rule;
