import {FieldDeclarationNode, Type, SyntaxKind} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindLeafNode} from './bindLeafNode';
import {bindArrayDeclaration} from './bindArrayDeclaration';

export function bindFieldDeclaration(
    fieldDeclaration: FieldDeclarationNode,
    context: BindContext
): void {

    context.ruleRegistry.emit(fieldDeclaration, 'enter');

    const mainType = fieldDeclaration.type === SyntaxKind.IntKeyword ? Type.Int : Type.Bool;

    fieldDeclaration.declarations.forEach(declaration => {

        declaration.parent = fieldDeclaration;
        const isIdentifier = declaration.kind === SyntaxKind.Identifier;

        if (isIdentifier) {
            bindLeafNode(declaration, context);
        }
        else {
            bindArrayDeclaration(declaration, context);
        }

        const type = (() => {
            if (mainType === Type.Int) {
                if (isIdentifier) {
                    return Type.Int;
                }
                return Type.IntArray;
            }
            else if (isIdentifier) {
                return Type.Bool;
            }
            return Type.BoolArray;
        })();

        const name = isIdentifier ? declaration.name : declaration.name.name;
        context.symbolTable.addSymbol({
            name,
            type,
            declaration: fieldDeclaration,
        });
    });

    context.ruleRegistry.emit(fieldDeclaration, 'exit');
}
