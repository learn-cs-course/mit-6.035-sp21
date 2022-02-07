import {BinaryExpressionNode, SyntaxKind, Type} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';

export function bindBinaryExpression(expression: BinaryExpressionNode, context: BindContext) {
    context.ruleRegistry.emit(expression, 'enter');

    const {left, right} = expression;
    left.parent = expression;
    bindExpression(left, context);

    right.parent = expression;
    bindExpression(right, context);

    switch (expression.operator) {
        case SyntaxKind.PlusToken:
        case SyntaxKind.MinusToken:
        case SyntaxKind.AsteriskToken:
        case SyntaxKind.SlashToken:
        case SyntaxKind.PercentToken:
            if (left.nodeType === Type.Int && right.nodeType === Type.Int) {
                expression.nodeType = Type.Int;
            }
            else if (left.nodeType !== Type.Unknown && right.nodeType !== Type.Unknown) {
                throw new Error('Invalid operands for binary expression');
            }
            break;
        case SyntaxKind.GreaterThanToken:
        case SyntaxKind.LessThanToken:
        case SyntaxKind.GreaterThanEqualsToken:
        case SyntaxKind.LessThanEqualsToken:
            if (left.nodeType === Type.Int && right.nodeType === Type.Int) {
                expression.nodeType = Type.Bool;
            }
            else if (left.nodeType !== Type.Unknown && right.nodeType !== Type.Unknown) {
                throw new Error('Invalid operands for binary expression');
            }
            break;
        case SyntaxKind.EqualsEqualsToken:
        case SyntaxKind.ExclamationEqualsToken:
            if (
                left.nodeType === right.nodeType
                && left.nodeType !== Type.Void
            ) {
                expression.nodeType = Type.Bool;
            }
            else if (left.nodeType !== Type.Unknown && right.nodeType !== Type.Unknown) {
                throw new Error('Invalid operands for binary expression');
            }
            break;
        case SyntaxKind.AmpersandAmpersandToken:
        case SyntaxKind.BarBarToken:
            if (left.nodeType === Type.Bool && right.nodeType === Type.Bool) {
                expression.nodeType = Type.Bool;
            }
            else if (left.nodeType !== Type.Unknown && right.nodeType !== Type.Unknown) {
                throw new Error('Invalid operands for binary expression');
            }
            break;
        default:
            throw new Error('Invalid operator for binary expression');
    }

    context.ruleRegistry.emit(expression, 'exit');
}
