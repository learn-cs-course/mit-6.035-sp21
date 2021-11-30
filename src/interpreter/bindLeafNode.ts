import {LeafNode, SyntaxKind, Type} from '../types/grammar';
import {BindContext} from './bindProgram';

/**
 * identifier break continue literal 等节点
 * 不包含子节点，不涉及 parent 操作，且不涉及 symbolTable 操作
 * 因此统一用一个函数处理
 *
 * @param leafNode
 * @param context
 */
export function bindLeafNode(leafNode: LeafNode, context: BindContext): void {
    context.ruleRegistry.emit(leafNode, 'enter');

    switch (leafNode.kind) {
        case SyntaxKind.Identifier:
        {
            if (leafNode.nodeType === undefined || leafNode.nodeType === Type.Unknown) {
                const identifierSymbol = context.symbolTable.find(leafNode.name);
                // symbol table 中没有这个变量
                if (!identifierSymbol) {
                    break;
                }
                // 保证 symbol table 中的类型合法
                if (
                    identifierSymbol.type === Type.Unknown
                    || identifierSymbol.type === Type.Void
                    || identifierSymbol.type === Type.Char
                    || identifierSymbol.type === Type.String
                ) {
                    break;
                }
                leafNode.nodeType = identifierSymbol.type;
                break;
            }
            leafNode.nodeType = Type.Unknown;
            break;
        }
        case SyntaxKind.BreakStatement:
        case SyntaxKind.ContinueStatement:
            leafNode.nodeType = Type.Void;
            break;
        case SyntaxKind.StringLiteral:
            leafNode.nodeType = Type.String;
            break;
        case SyntaxKind.IntLiteral:
        {
            leafNode.nodeType = Type.Int;

            const radix = leafNode.value.startsWith('0x') ? 16 : 10;
            const value = leafNode.value.toLowerCase();
            const parent = leafNode.parent!;

            if (parent.kind === SyntaxKind.UnaryExpression) {
                if (parent.operator === SyntaxKind.MinusToken) {
                    if (radix === 16 && value > '0x8000000000000000') {
                        throw new Error('int literal underflow');
                    }
                    else if (radix === 10 && value > '9223372036854775808') {
                        throw new Error('int literal underflow');
                    }
                }
            }
            else if (radix === 16 && value > '0x7fffffffffffffff') {
                throw new Error('int literal overflow');
            }
            else if (radix === 10 && value > '9223372036854775807') {
                throw new Error('int literal overflow');
            }

            break;
        }
        case SyntaxKind.CharLiteral:
            leafNode.nodeType = Type.Char;
            break;
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword:
            leafNode.nodeType = Type.Bool;
            break;
        default:
            // 大气点，毕竟我都已经把类型整 never 了
            // @ts-expect-error
            throw new Error(`unexpected leaf node kind: ${leafNode.kind}`);
    }

    context.ruleRegistry.emit(leafNode, 'exit');
}
