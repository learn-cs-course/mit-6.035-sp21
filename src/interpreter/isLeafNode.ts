/**
 * @file 是否为 ast 叶子节点
 */

import {BaseNode, SyntaxKind, LeafNode} from '../types/grammar';

export function isLeafNode(node: BaseNode): node is LeafNode {
    switch (node.kind) {
        case SyntaxKind.Identifier:
        case SyntaxKind.StringLiteral:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword:
        case SyntaxKind.IntLiteral:
        case SyntaxKind.CharLiteral:
        case SyntaxKind.BreakStatement:
        case SyntaxKind.ContinueStatement:
            return true;
        default:
            return false;
    }
}
