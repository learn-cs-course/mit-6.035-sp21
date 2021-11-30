import {UnaryExpressionNode, SyntaxKind, Type} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';

export function bindUnaryExpression(expression: UnaryExpressionNode, context: BindContext) {
    context.ruleRegistry.emit(expression, 'enter');

    expression.operand.parent = expression;
    bindExpression(expression.operand, context);

    switch (expression.operator) {
        case SyntaxKind.MinusToken:
            if (expression.operand.nodeType === Type.Int) {
                expression.nodeType = Type.Int;
            }
            else {
                throw new Error('Unary minus operator can only be applied to int');
            }
            break;
        case SyntaxKind.ExclamationToken:
            if (expression.operand.nodeType === Type.Bool) {
                expression.nodeType = Type.Bool;
            }
            else {
                throw new Error('Unary exclamation operator can only be applied to bool');
            }
            break;
        default:
            throw new Error(`Unknown unary operator ${expression.operator}`);
    }

    context.ruleRegistry.emit(expression, 'exit');
}
