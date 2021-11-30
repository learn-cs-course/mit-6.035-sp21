import {MethodDeclarationNode, Type} from '../types/grammar';
import {BindContext} from './bindProgram';
import {bindParameter} from './bindParameter';
import {bindBlock} from './bindBlock';

export function bindMethodDeclaration(
    methodDeclaration: MethodDeclarationNode,
    context: BindContext
): void {
    context.ruleRegistry.emit(methodDeclaration, 'enter');

    methodDeclaration.name.parent = methodDeclaration;

    context.symbolTable.addSymbol({
        name: methodDeclaration.name.name,
        type: Type.Method,
        declaration: methodDeclaration,
    });

    context.symbolTable.enterScope('block');

    // 函数参数算到 body block scope 中
    methodDeclaration.parameters.forEach(parameter => {
        parameter.parent = methodDeclaration;
        bindParameter(parameter, context);
    });

    methodDeclaration.body.parent = methodDeclaration;

    bindBlock(methodDeclaration.body, context);

    context.symbolTable.exitScope();

    context.ruleRegistry.emit(methodDeclaration, 'exit');
}
