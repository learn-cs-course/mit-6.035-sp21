import {ArrayLocationNode} from '../types/grammar';
import {bindLeafNode} from './bindLeafNode';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';

export function bindArrayLocation(
    expression: ArrayLocationNode,
    context: BindContext
): void {
    context.ruleRegistry.emit(expression, 'enter');

    expression.name.parent = expression;
    bindLeafNode(expression.name, context);
    expression.index.parent = expression;
    bindExpression(expression.index, context);

    context.ruleRegistry.emit(expression, 'exit');
}
