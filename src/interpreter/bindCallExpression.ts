import {CallExpressionNode} from '../types/grammar';
import {bindLeafNode} from './bindLeafNode';
import {BindContext} from './bindProgram';

export function bindCallExpression(expression: CallExpressionNode, context: BindContext) {
    context.ruleRegistry.emit(expression, 'enter');

    expression.callee.parent = expression;
    bindLeafNode(expression.callee, context);

    expression.arguments.forEach(argument => {
        argument.parent = expression;
        // identifier 和 string literal 都是叶子节点
        bindLeafNode(argument, context);
    });

    context.ruleRegistry.emit(expression, 'exit');
}
