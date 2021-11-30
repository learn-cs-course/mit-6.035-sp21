import {CallStatementNode} from '../types/grammar';
import {bindCallExpression} from './bindCallExpression';
import {BindContext} from './bindProgram';

export function bindCallStatement(statement: CallStatementNode, context: BindContext) {
    context.ruleRegistry.emit(statement, 'enter');

    statement.expression.parent = statement;
    bindCallExpression(statement.expression, context);

    context.ruleRegistry.emit(statement, 'exit');
}
