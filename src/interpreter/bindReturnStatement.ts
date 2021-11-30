import {ReturnStatementNode} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';

export function bindReturnStatement(returnStatement: ReturnStatementNode, context: BindContext): void {
    context.ruleRegistry.emit(returnStatement, 'enter');
    if (returnStatement.expression) {
        returnStatement.expression.parent = returnStatement;
        bindExpression(returnStatement.expression, context);
    }
    context.ruleRegistry.emit(returnStatement, 'exit');
}
