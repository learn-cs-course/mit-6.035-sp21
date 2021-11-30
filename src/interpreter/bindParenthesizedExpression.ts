import {ParenthesizedExpressionNode} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';

export function bindParenthesizedExpression(expression: ParenthesizedExpressionNode, context: BindContext) {
    context.ruleRegistry.emit(expression, 'enter');

    expression.expression.parent = expression;
    bindExpression(expression.expression, context);

    context.ruleRegistry.emit(expression, 'exit');
}
