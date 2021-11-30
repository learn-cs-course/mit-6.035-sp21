import {ArrayDeclarationNode} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindLeafNode} from './bindLeafNode';

export function bindArrayDeclaration(
    arrayDeclaration: ArrayDeclarationNode,
    context: BindContext
): void {
    context.ruleRegistry.emit(arrayDeclaration, 'enter');

    arrayDeclaration.name.parent = arrayDeclaration;
    bindLeafNode(arrayDeclaration.name, context);

    context.ruleRegistry.emit(arrayDeclaration, 'exit');
}
