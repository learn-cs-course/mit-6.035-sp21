import {ForStatementNode} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';
import {bindBlock} from './bindBlock';
import {bindForInitializer} from './bindForInitializer';
import {bindForIncrement} from './bindForIncrement';

export function bindForStatement(forStatement: ForStatementNode, context: BindContext) {
    context.ruleRegistry.emit(forStatement, 'enter');

    forStatement.initializer.parent = forStatement;
    bindForInitializer(forStatement.initializer, context);

    forStatement.condition.parent = forStatement;
    bindExpression(forStatement.condition, context);

    forStatement.increment.parent = forStatement;
    bindForIncrement(forStatement.increment, context);

    forStatement.body.parent = forStatement;
    bindBlock(forStatement.body, context);

    context.ruleRegistry.emit(forStatement, 'exit');
}
