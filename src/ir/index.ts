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
    LiteralNode,
} from '../types/grammar';

/**
 * 在写这部分的时候我非常想重构 interpreter，主要是想把类型再搞一搞
 * 但是好像必要性不是很大，先忍了
 */

type IRPlainCode = EnterIRCode
    | ReturnIRCode
    | CallIRCode
    | ArgumentIRCode;

interface EnterIRCode {
    type: IRCodeType.enter;
}

function createEnterIRCode(): EnterIRCode {
    return {type: IRCodeType.enter};
}

interface ReturnIRCode {
    type: IRCodeType.return;
}

function createReturnIRCode(): ReturnIRCode {
    return {type: IRCodeType.return};
}

interface CallIRCode {
    type: IRCodeType.call;
    name: string;
    length: number;
}

function createCallIRCode(name: string, length: number): CallIRCode {
    return {
        type: IRCodeType.call,
        name,
        length,
    };
}

interface ArgumentIRCode {
    type: IRCodeType.argument;
    kind: SyntaxKind.Identifier | SyntaxKind.StringLiteral | LiteralNode;
    value: string;
}

function createArgumentIRCode(
    kind: SyntaxKind.Identifier | SyntaxKind.StringLiteral | LiteralNode,
    value: string
): ArgumentIRCode {
    return {
        type: IRCodeType.argument,
        kind,
        value,
    };
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
    constants: StringConstantsPool;
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

    methodDeclaration.body.statements.forEach(statement => {
        switch (statement.kind) {
            case SyntaxKind.CallStatement:
            {
                const {callee} = statement.expression;

                statement.expression.arguments.forEach(argumentNode => {
                    switch (argumentNode.kind) {
                        case SyntaxKind.StringLiteral:
                        {
                            const label = programIR.constants.getLabel(argumentNode.value);
                            methodSymbol.codes.push(
                                createArgumentIRCode(SyntaxKind.StringLiteral, label)
                            );
                            break;
                        }
                    }
                });

                methodSymbol.codes.push(
                    createCallIRCode(callee.name, statement.expression.arguments.length)
                );

                break;
            }
        }
    });

    methodSymbol.codes.push(createReturnIRCode());

    return methodSymbol;
}

class StringConstantsPool {

    private readonly map = new Map<string, number>();

    getLabel(stringLiteral: string): string {
        if (this.map.has(stringLiteral)) {
            return `.msg${this.map.get(stringLiteral)}`;
        }
        this.map.set(stringLiteral, this.map.size);
        return `.msg${this.map.size - 1}`;
    }

    get size() {
        return this.map.size;
    }

    entries() {
        return this.map.entries();
    }

}

export function genIR(ast: ProgramNode) {
    const programIR: ProgramIR = {
        globals: [],
        constants: new StringConstantsPool(),
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
