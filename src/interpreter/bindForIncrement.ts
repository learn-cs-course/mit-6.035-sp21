import {ForIncrementNode, SyntaxKind} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';
import {bindLeafNode} from './bindLeafNode';
import {bindArrayLocation} from './bindArrayLocation';

export function bindForIncrement(increment: ForIncrementNode, context: BindContext) {
    context.ruleRegistry.emit(increment, 'enter');

    increment.declaration.parent = increment;
    if (increment.declaration.kind === SyntaxKind.Identifier) {
        bindLeafNode(increment.declaration, context);
    }
    else {
        bindArrayLocation(increment.declaration, context);
    }

    if (increment.expression) {
        increment.expression.parent = increment;
        bindExpression(increment.expression, context);
    }

    context.ruleRegistry.emit(increment, 'exit');
}
