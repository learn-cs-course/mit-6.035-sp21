import {CallExpressionNode, SyntaxKind, Type} from '../types/grammar';
import {bindLeafNode} from './bindLeafNode';
import {BindContext} from './bindProgram';
import {bindExpression} from './bindExpression';
import {isLeafNode} from './isLeafNode';

export function bindCallExpression(expression: CallExpressionNode, context: BindContext) {
    context.ruleRegistry.emit(expression, 'enter');

    expression.callee.parent = expression;
    bindLeafNode(expression.callee, context);

    expression.arguments.forEach(argument => {
        argument.parent = expression;
        // identifier 和 string literal 都是叶子节点
        const isLeaf = isLeafNode(argument);
        if (isLeaf) {
            bindLeafNode(argument, context);
        }
        else {
            bindExpression(argument, context);
        }
    });

    if (
        expression.callee.nodeType !== Type.Method
        && expression.callee.name !== 'len'
    ) {
        throw new Error(`${expression.callee.name} is not a method`);
    }

    const symbol = context.symbolTable.find(expression.callee.name);
    if (!symbol) {
        if (expression.callee.name === 'len') {
            expression.nodeType = Type.Int;
        }
        context.ruleRegistry.emit(expression, 'exit');
        return;
    }
    const declaration = symbol.declaration;
    if (declaration.kind === SyntaxKind.MethodDeclaration) {
        expression.nodeType = (() => {
            const returnType = declaration.returnType;
            if (returnType === SyntaxKind.BoolKeyword) {
                return Type.Bool;
            }
            else if (returnType === SyntaxKind.IntKeyword) {
                return Type.Int;
            }
            else if (returnType === SyntaxKind.VoidKeyword) {
                return Type.Void;
            }
            else {
                throw new Error(`${returnType} is not a valid return type`);
            }
        })();
    }
    else {
        // import declaration
        expression.nodeType = Type.Unknown;
    }

    context.ruleRegistry.emit(expression, 'exit');
}
