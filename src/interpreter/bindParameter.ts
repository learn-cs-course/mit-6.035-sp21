import {ParameterNode, SyntaxKind, Type} from '../types/grammar';
import {bindLeafNode} from './bindLeafNode';
import {BindContext} from './bindProgram';

export function bindParameter(parameter: ParameterNode, context: BindContext): void {
    context.ruleRegistry.emit(parameter, 'enter');

    parameter.name.parent = parameter;

    bindLeafNode(parameter.name, context);

    context.symbolTable.addSymbol({
        name: parameter.name.name,
        type: parameter.type === SyntaxKind.IntKeyword ? Type.Int : Type.Bool,
        declaration: parameter,
    });
    parameter.nodeType = parameter.type === SyntaxKind.IntKeyword ? Type.Int : Type.Bool;

    context.ruleRegistry.emit(parameter, 'exit');
}
