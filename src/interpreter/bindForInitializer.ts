import {ForInitializerNode} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';
import {bindLeafNode} from './bindLeafNode';

export function bindForInitializer(initializer: ForInitializerNode, context: BindContext) {
    context.ruleRegistry.emit(initializer, 'enter');

    initializer.declaration.parent = initializer;
    bindLeafNode(initializer.declaration, context);

    initializer.expression.parent = initializer;
    bindExpression(initializer.expression, context);

    context.ruleRegistry.emit(initializer, 'exit');
}
