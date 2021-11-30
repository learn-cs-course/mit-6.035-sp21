import {UnaryExpressionNode} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';

export function bindUnaryExpression(expression: UnaryExpressionNode, context: BindContext) {
    context.ruleRegistry.emit(expression, 'enter');

    expression.operand.parent = expression;
    bindExpression(expression.operand, context);

    context.ruleRegistry.emit(expression, 'exit');
}
