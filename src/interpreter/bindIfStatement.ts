import {IfStatementNode} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';
import {bindBlock} from './bindBlock';

export function bindIfStatement(ifStatement: IfStatementNode, context: BindContext) {
    context.ruleRegistry.emit(ifStatement, 'enter');

    ifStatement.condition.parent = ifStatement;
    bindExpression(ifStatement.condition, context);

    ifStatement.thenBlock.parent = ifStatement;
    context.symbolTable.enterScope('block');
    bindBlock(ifStatement.thenBlock, context);
    context.symbolTable.exitScope();

    if (ifStatement.elseBlock) {
        ifStatement.elseBlock.parent = ifStatement;
        context.symbolTable.enterScope('block');
        bindBlock(ifStatement.elseBlock, context);
        context.symbolTable.exitScope();
    }

    context.ruleRegistry.emit(ifStatement, 'exit');
}
