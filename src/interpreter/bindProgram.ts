/**
 * @file 语义规则检查
 */

import {ProgramNode} from '../types/grammar';
import {bindFieldDeclaration} from './bindFieldDeclaration';
import {bindImportDeclaration} from './bindImportDeclaration';
import {bindMethodDeclaration} from './bindMethodDeclaration';
import {SymbolTable} from './symbolTable';
import {RuleRegistry} from './ruleRegistry';

export interface BindContext {
    symbolTable: SymbolTable;
    ruleRegistry: RuleRegistry;
}

/**
 * 为 ast 添加语义节点
 * 例如，为每个节点添加 parent 节点
 *
 * @param program
 */
export function bindProgram(program: ProgramNode): void {

    const symbolTable = new SymbolTable();
    symbolTable.enterScope('global');

    const ruleRegistry = new RuleRegistry(symbolTable);

    const context = {
        symbolTable,
        ruleRegistry,
    };

    ruleRegistry.emit(program, 'enter');

    program.importDeclarations.forEach(node => {
        node.parent = program;
        bindImportDeclaration(node, context);
    });
    program.fieldDeclarations.forEach(node => {
        node.parent = program;
        bindFieldDeclaration(node, context);
    });
    program.methodDeclarations.forEach(node => {
        node.parent = program;
        bindMethodDeclaration(node, context);
    });

    program.globals = symbolTable.getCurrentScope()?.symbols;
    symbolTable.exitScope();
    ruleRegistry.emit(program, 'enter');
}
