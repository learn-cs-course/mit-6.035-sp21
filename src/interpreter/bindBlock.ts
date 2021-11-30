import {BlockNode} from '../types/grammar';
import {bindFieldDeclaration} from './bindFieldDeclaration';
import {BindContext} from './bindProgram';
import {bindStatement} from './bindStatement';

export function bindBlock(block: BlockNode, context: BindContext): void {
    context.ruleRegistry.emit(block, 'enter');

    block.fields.forEach(field => {
        field.parent = block;
        bindFieldDeclaration(field, context);
    });

    block.statements.forEach(statement => {
        statement.parent = block;
        bindStatement(statement, context);
    });
    block.locals = context.symbolTable.getCurrentScope()?.symbols;

    context.ruleRegistry.emit(block, 'exit');
}
