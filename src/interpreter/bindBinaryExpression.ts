import {BinaryExpressionNode} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';

export function bindBinaryExpression(expression: BinaryExpressionNode, context: BindContext) {
    context.ruleRegistry.emit(expression, 'enter');

    const {left, right} = expression;
    left.parent = expression;
    bindExpression(left, context);

    right.parent = expression;
    bindExpression(right, context);

    context.ruleRegistry.emit(expression, 'exit');
}
