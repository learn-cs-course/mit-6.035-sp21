import {ExpressionNode, SyntaxKind} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindArrayLocation} from './bindArrayLocation';
import {bindLeafNode} from './bindLeafNode';
import {bindCallExpression} from './bindCallExpression';
import {bindParenthesizedExpression} from './bindParenthesizedExpression';
import {bindBinaryExpression} from './bindBinaryExpression';
import {bindUnaryExpression} from './bindUnaryExpression';

/**
 * 和 bindStatement 一样，也是一个派发用的函数
 *
 * @param expression
 * @param context
 */
export function bindExpression(
    expression: ExpressionNode,
    context: BindContext
): void {
    switch (expression.kind) {
        case SyntaxKind.Identifier:
        case SyntaxKind.IntLiteral:
        case SyntaxKind.CharLiteral:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword:
            bindLeafNode(expression, context);
            break;
        case SyntaxKind.ArrayLocation:
            bindArrayLocation(expression, context);
            break;
        case SyntaxKind.CallExpression:
            bindCallExpression(expression, context);
            break;
        case SyntaxKind.BinaryExpression:
            bindBinaryExpression(expression, context);
            break;
        case SyntaxKind.UnaryExpression:
            bindUnaryExpression(expression, context);
            break;
        case SyntaxKind.ParenthesizedExpression:
            bindParenthesizedExpression(expression, context);
            break;
        default:
            throw new Error('Unknown expression kind.');
    }
}
