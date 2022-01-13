/**
 * @file 生成三地址码形式的中间表示
 */

import {
    ProgramNode,
    SyntaxKind,
    Type,
    IRCodeType,
    VariableDeclarationNode,
    MethodDeclarationNode,
} from '../types/grammar';

/**
 * 在写这部分的时候我非常想重构 interpreter，主要是想把类型再搞一搞
 * 但是好像必要性不是很大，先忍了
 */

type IRPlainCode = EnterIRCode
    | ReturnIRCode;

interface EnterIRCode {
    type: IRCodeType.enter;
}

interface ReturnIRCode {
    type: IRCodeType.return;
}

function createEnterIRCode(): EnterIRCode {
    return {type: IRCodeType.enter};
}

function createReturnIRCode(): ReturnIRCode {
    return {type: IRCodeType.return};
}

interface FieldSymbol {
    name: string;
    size: number;
}

function createFieldSymbol(node: VariableDeclarationNode): FieldSymbol {
    if (node.kind === SyntaxKind.Identifier) {
        // bool 类型 1 byte，int 类型 8 byte，其他情况这里不存在
        const size = node.nodeType === Type.Bool ? 1 : 8;
        return {
            name: node.name,
            size,
        };
    }
    // 这里是 array
    const singleItemSize = node.nodeType === Type.BoolArray ? 1 : 8;
    const radix = node.size.value.startsWith('0x') ? 16 : 10;
    const size = singleItemSize * parseInt(node.size.value, radix);
    return {
        name: node.name.name,
        size,
    };
}

export interface ProgramIR {
    globals: FieldSymbol[];
    constants: string[];
    methods: Method[];
    enbaleArrayBoundCheck: boolean;
    enableReturnTypeCheck: boolean;
}

interface Method {
    name: string;
    symbols: FieldSymbol[];
    codes: IRPlainCode[];
}

function genMethodIR(
    methodDeclaration: MethodDeclarationNode,
    programIR: ProgramIR
) {
    if (methodDeclaration.returnType !== SyntaxKind.VoidKeyword) {
        programIR.enableReturnTypeCheck = true;
    }

    const methodSymbol: Method = {
        name: methodDeclaration.name.name,
        symbols: [],
        codes: [],
    };

    // methodDeclaration.parameters

    methodSymbol.codes.push(createEnterIRCode());

    // methodDeclaration.body.fields.forEach

    // methodDeclaration.body.statements.forEach

    methodSymbol.codes.push(createReturnIRCode());

    return methodSymbol;
}

export function genIR(ast: ProgramNode) {
    const programIR: ProgramIR = {
        globals: [],
        constants: [],
        methods: [],
        enbaleArrayBoundCheck: false,
        enableReturnTypeCheck: false,
    };

    ast.fieldDeclarations.forEach(fieldDeclaration => {
        fieldDeclaration.declarations.forEach(declaration => {
            const globolSymbol = createFieldSymbol(declaration);
            programIR.globals.push(globolSymbol);
        });
    });

    ast.methodDeclarations.forEach(methodDeclaration => {
        const methodSymbol = genMethodIR(methodDeclaration, programIR);
        programIR.methods.push(methodSymbol);
    });

    return programIR;
}
