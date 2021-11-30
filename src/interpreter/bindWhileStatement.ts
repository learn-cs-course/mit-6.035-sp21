import {WhileStatementNode} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';
import {bindBlock} from './bindBlock';

export function bindWhileStatement(whileStatement: WhileStatementNode, context: BindContext) {
    context.ruleRegistry.emit(whileStatement, 'enter');

    whileStatement.condition.parent = whileStatement;
    bindExpression(whileStatement.condition, context);

    context.symbolTable.enterScope('block');
    whileStatement.body.parent = whileStatement;
    bindBlock(whileStatement.body, context);
    context.symbolTable.exitScope();

    context.ruleRegistry.emit(whileStatement, 'exit');
}
