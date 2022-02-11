import {
    SyntaxKind,
    Type, VariableDeclarationNode,
} from '../types/grammar';


export interface FieldSymbol {
    name: string;
    typeSize: number;
    size: number;
}

export function createFieldSymbol(node: VariableDeclarationNode): FieldSymbol {
    if (node.kind === SyntaxKind.Identifier) {
        // @todo 处理数据类型
        // bool 类型 1 byte，int 类型 8 byte，其他情况这里不存在
        const size = node.nodeType === Type.Bool ? 8 : 8;
        return {
            name: node.name,
            typeSize: size,
            size,
        };
    }
    // 这里是 array
    // @todo 处理数据类型
    const singleItemSize = node.nodeType === Type.BoolArray ? 8 : 8;
    const radix = node.size.value.startsWith('0x') ? 16 : 10;
    const size = singleItemSize * parseInt(node.size.value, radix);
    return {
        name: node.name.name,
        typeSize: singleItemSize,
        size,
    };
}
