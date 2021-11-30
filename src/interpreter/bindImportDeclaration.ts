import {ImportDeclarationNode, Type} from '../types/grammar';
import {bindLeafNode} from './bindLeafNode';
import {BindContext} from './bindProgram';

export function bindImportDeclaration(
    importDeclaration: ImportDeclarationNode,
    context: BindContext
): void {

    context.ruleRegistry.emit(importDeclaration, 'enter');

    importDeclaration.importName.parent = importDeclaration;

    bindLeafNode(importDeclaration.importName, context);

    context.symbolTable.addSymbol({
        name: importDeclaration.importName.name,
        type: Type.Unknown,
        declaration: importDeclaration,
    });

    context.ruleRegistry.emit(importDeclaration, 'exit');

}
