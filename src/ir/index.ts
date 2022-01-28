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
    BlockNode,
    ExpressionNode,
    BinaryOperator,
    UnaryOperator,
    LiteralNode,
} from '../types/grammar';
import {SymbolTable} from './symbolTable';

/**
 * 在写这部分的时候我非常想重构 interpreter，主要是想把类型再搞一搞
 * 但是好像必要性不是很大，先忍了
 */

class JumpLabels {
    private labelId = 0;

    getLabel() {
        return `.Label${this.labelId++}`;
    }
}

const globalLabels = new JumpLabels();

type IRPlainCode = EnterIRCode
    | ReturnIRCode
    | CallIRCode
    | ArgumentIRCode
    | AssignIRCode
    | BinaryIRCode
    | LabelIRCode
    | ConditionalJumpIRCode
    | JumpIRCode;

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

interface StringLiteralArgumentIRCode {
    type: IRCodeType.argument;
    kind: SyntaxKind.StringLiteral;
    label: string;
}

interface IdentifierArgumentIRCode {
    type: IRCodeType.argument;
    kind: SyntaxKind.Identifier;
    name: string;
    offset: number;
}

interface LiteralArgumentIRCode {
    type: IRCodeType.argument;
    kind: LiteralNode;
    value: string;
}

export type ArgumentIRCode = StringLiteralArgumentIRCode | IdentifierArgumentIRCode | LiteralArgumentIRCode;

function createArgumentIRCode(
    kind: SyntaxKind.Identifier | SyntaxKind.StringLiteral | LiteralNode,
    value: string,
    offset?: number
): ArgumentIRCode {
    if (kind === SyntaxKind.Identifier) {
        return {
            type: IRCodeType.argument,
            kind,
            name: value,
            offset: offset!,
        };
    }
    if (kind === SyntaxKind.StringLiteral) {
        return {
            type: IRCodeType.argument,
            kind,
            label: value,
        };
    }
    return {
        type: IRCodeType.argument,
        kind,
        value,
    };
}

export const enum ValueType {
    // 立即数
    Imm,
    // 临时变量
    Tmp,
    // 标识符
    Identifier,
    // 数组元素
    ArrayLocation,
}

interface ImmValue {
    type: ValueType.Imm;
    value: number;
}

interface TmpValue {
    type: ValueType.Tmp;
    name: string;
}

interface IdentifierValue {
    type: ValueType.Identifier;
    name: string;
    offset: number;
}

interface ArrayLocationValue {
    type: ValueType.ArrayLocation;
    name: string;
    index: ImmValue | TmpValue;
    offset: number;
}

type AssignmentIRCodeRigntValue = ImmValue | TmpValue | IdentifierValue | ArrayLocationValue;

interface AssignIRCode {
    type: IRCodeType.assign;
    left: AssignmentIRCodeRigntValue;
    right: AssignmentIRCodeRigntValue;
}

function createAssignIRCode(
    left: AssignmentIRCodeRigntValue,
    right: AssignmentIRCodeRigntValue
): AssignIRCode {
    return {
        type: IRCodeType.assign,
        left,
        right,
    };
}

interface BinaryIRCode {
    type: IRCodeType.binary;
    operator: BinaryOperator;
    result: TmpValue;
    left: TmpValue | ImmValue | IdentifierValue;
    right: TmpValue | ImmValue | IdentifierValue;
}

function createBinaryIRCode(
    operator: BinaryOperator,
    result: TmpValue,
    left: TmpValue | ImmValue | IdentifierValue,
    right: TmpValue | ImmValue | IdentifierValue
): BinaryIRCode {
    return {
        type: IRCodeType.binary,
        operator,
        result,
        left,
        right,
    };
}

interface LabelIRCode {
    type: IRCodeType.label;
    label: string;
}

function createLabelIRCode(label: string): LabelIRCode {
    return {
        type: IRCodeType.label,
        label,
    };
}

interface ConditionalJumpIRCode {
    type: IRCodeType.conditionalJump;
    operator: BinaryOperator;
    left: TmpValue | ImmValue | IdentifierValue;
    right: TmpValue | ImmValue | IdentifierValue;
    targetLabel: string;
}

function createConditionalJumpIRCode(
    operator: BinaryOperator,
    left: TmpValue | ImmValue | IdentifierValue,
    right: TmpValue | ImmValue | IdentifierValue,
    targetLabel: string
): ConditionalJumpIRCode {
    return {
        type: IRCodeType.conditionalJump,
        operator,
        left,
        right,
        targetLabel,
    };
}

interface JumpIRCode {
    type: IRCodeType.jump;
    targetLabel: string;
}

function createJumpIRCode(
    targetLabel: string
): JumpIRCode {
    return {
        type: IRCodeType.jump,
        targetLabel,
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

function calcBinaryExpression(
    left: ImmValue,
    right: ImmValue,
    operator: BinaryOperator
): ImmValue {
    // 用 bigInt 避免 js 精度问题
    const leftValue = BigInt(left.value);
    const rightValue = BigInt(right.value);
    switch (operator) {
        case SyntaxKind.PlusToken:
            return {type: ValueType.Imm, value: Number(leftValue + rightValue)};
        case SyntaxKind.MinusToken:
            return {type: ValueType.Imm, value: Number(leftValue - rightValue)};
        case SyntaxKind.AsteriskToken:
            return {type: ValueType.Imm, value: Number(leftValue * rightValue)};
        case SyntaxKind.SlashToken:
            return {type: ValueType.Imm, value: Number(leftValue / rightValue)};
        case SyntaxKind.PercentToken:
            return {type: ValueType.Imm, value: Number(leftValue % rightValue)};
        case SyntaxKind.GreaterThanToken:
            return {type: ValueType.Imm, value: Number(leftValue > rightValue)};
        case SyntaxKind.LessThanToken:
            return {type: ValueType.Imm, value: Number(leftValue < rightValue)};
        case SyntaxKind.GreaterThanEqualsToken:
            return {type: ValueType.Imm, value: Number(leftValue >= rightValue)};
        case SyntaxKind.LessThanEqualsToken:
            return {type: ValueType.Imm, value: Number(leftValue <= rightValue)};
        case SyntaxKind.EqualsEqualsToken:
            return {type: ValueType.Imm, value: Number(leftValue === rightValue)};
        case SyntaxKind.ExclamationEqualsToken:
            return {type: ValueType.Imm, value: Number(leftValue !== rightValue)};
        case SyntaxKind.AmpersandAmpersandToken:
            return {type: ValueType.Imm, value: Number(Boolean(leftValue && rightValue))};
        case SyntaxKind.BarBarToken:
            return {type: ValueType.Imm, value: Number(Boolean(leftValue || rightValue))};
    }
}

function calcUnaryExpression(
    operand: ImmValue,
    operator: UnaryOperator
): ImmValue {
    switch (operator) {
        case SyntaxKind.MinusToken:
            return {type: ValueType.Imm, value: -operand.value};
        case SyntaxKind.ExclamationToken:
            return {type: ValueType.Imm, value: Number(Boolean(!operand.value))};
    }
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
    localSize: number;
}

function genMethodIR(
    methodDeclaration: MethodDeclarationNode,
    programIR: ProgramIR
) {

    if (methodDeclaration.returnType !== SyntaxKind.VoidKeyword) {
        programIR.enableReturnTypeCheck = true;
    }

    const symbolTable = new SymbolTable();

    symbolTable.enterScope('block');

    const methodSymbol: Method = {
        name: methodDeclaration.name.name,
        symbols: [],
        codes: [],
        localSize: 0,
    };

    function genExpersionNodeForRValue(node: ExpressionNode): AssignmentIRCodeRigntValue {
        switch (node.kind) {
            case SyntaxKind.IntLiteral:
            {
                const radix = node.value.startsWith('0x') ? 16 : 10;
                return {
                    type: ValueType.Imm,
                    value: parseInt(node.value, radix),
                };
            }
            case SyntaxKind.Identifier:
            {
                const symbol = symbolTable.find(node.name);

                if (!symbol) {
                    throw new Error('unexpected');
                }

                let offset: number = 0;

                switch (symbol.kind) {
                    case 'global':
                        // @todo 我猜我是瞎写的
                        offset = 200;
                        break;
                    case 'local':
                        offset = symbol.offset;
                        break;
                    default:
                        throw new Error('unexpected');
                }
                return {
                    type: ValueType.Identifier,
                    name: node.name,
                    offset,
                };
            }
            case SyntaxKind.ParenthesizedExpression:
            {
                return genExpersionNodeForRValue(node.expression);
            }
            case SyntaxKind.BinaryExpression:
            {
                const {left, right, operator} = node;

                // @todo 应该不是所有的情况，都能走 gen expr 的，感觉 a[x] 会复杂一些
                const leftGen = genExpersionNodeForRValue(left);
                const rightGen = genExpersionNodeForRValue(right);

                // 预先计算
                if (leftGen.type === ValueType.Imm && rightGen.type === ValueType.Imm) {
                    return calcBinaryExpression(leftGen, rightGen, operator);
                }

                if (leftGen.type === ValueType.ArrayLocation) {
                    throw new Error('todo');
                }
                if (rightGen.type === ValueType.ArrayLocation) {
                    throw new Error('todo');
                }

                const tmpValue = {
                    type: ValueType.Tmp,
                    name: symbolTable.addTmpVariable(),
                } as const;

                methodSymbol.codes.push(createBinaryIRCode(operator, tmpValue, leftGen, rightGen));

                return tmpValue;
            }
            case SyntaxKind.UnaryExpression:
            {
                const {operator, operand} = node;

                const operandGen = genExpersionNodeForRValue(operand);
                if (operandGen.type === ValueType.Imm) {
                    return calcUnaryExpression(operandGen, operator);
                }
                throw new Error('todo');
            }
            default:
                throw new Error('unexpected');
        }
    }

    function genExpersionNodeForJump(
        node: ExpressionNode,
        trueLabel: LabelIRCode,
        falseLabel: LabelIRCode
    ) {
        switch (node.kind) {
            case SyntaxKind.BinaryExpression:
            {
                // @todo 利用 fall 的性质，这里有大量的 label 可以合并
                // 懒的优化了，先过 case，我感觉我要写不下去了
                switch (node.operator) {
                    case SyntaxKind.GreaterThanEqualsToken:
                    case SyntaxKind.GreaterThanToken:
                    case SyntaxKind.LessThanEqualsToken:
                    case SyntaxKind.LessThanToken:
                    case SyntaxKind.EqualsEqualsToken:
                    case SyntaxKind.ExclamationEqualsToken:
                    {
                        // 无论如何，就算子节点里面有控制流，到比较大小这一步，都需要的是 rvalue
                        const left = genExpersionNodeForRValue(node.left);
                        const right = genExpersionNodeForRValue(node.right);
                        methodSymbol.codes.push(createConditionalJumpIRCode(
                            node.operator,
                            // @ts-expect-error
                            left,
                            right,
                            trueLabel.label
                        ));
                        methodSymbol.codes.push(createJumpIRCode(falseLabel.label));
                        break;
                    }
                    case SyntaxKind.BarBarToken:
                    {
                        const newFalseLabel = globalLabels.getLabel();
                        const newFalseLabelIRCode = createLabelIRCode(newFalseLabel);
                        genExpersionNodeForJump(node.left, trueLabel, newFalseLabelIRCode);
                        methodSymbol.codes.push(newFalseLabelIRCode);
                        genExpersionNodeForJump(node.right, trueLabel, falseLabel);
                        break;
                    }
                    case SyntaxKind.AmpersandAmpersandToken:
                    {
                        const newTrueLabel = globalLabels.getLabel();
                        const newTrueLabelIRCode = createLabelIRCode(newTrueLabel);
                        genExpersionNodeForJump(node.left, newTrueLabelIRCode, falseLabel);
                        methodSymbol.codes.push(newTrueLabelIRCode);
                        genExpersionNodeForJump(node.right, trueLabel, falseLabel);
                        break;
                    }
                }
                break;
            }
            default:
                throw new Error('todo');
        }
    }

    // methodDeclaration.parameters

    methodSymbol.codes.push(createEnterIRCode());

    function genBlockNode(node: BlockNode) {
        node.fields.forEach(field => {
            const type = field.type;
            const typeSize = type === SyntaxKind.IntKeyword ? 8 : 1;
            field.declarations.forEach(declaration => {
                if (declaration.kind === SyntaxKind.Identifier) {
                    symbolTable.addLocal(declaration.name, typeSize);
                }
                else {
                    const name = declaration.name.name;
                    const length = declaration.size.value.startsWith('0x')
                        ? parseInt(declaration.size.value, 16)
                        : parseInt(declaration.size.value, 10);
                    symbolTable.addLocal(name, length * typeSize);
                }
            });
        });

        node.statements.forEach(statement => {
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
                            case SyntaxKind.Identifier:
                            {
                                const symbol = symbolTable.find(argumentNode.name)!;
                                if (symbol.kind !== 'local') {
                                    throw new Error('unexpected');
                                }
                                methodSymbol.codes.push(
                                    createArgumentIRCode(SyntaxKind.Identifier, argumentNode.name, symbol.offset)
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
                case SyntaxKind.AssignmentStatement:
                {
                    const {left, right, operator} = statement;
                    switch (operator) {
                        case SyntaxKind.EqualsToken:
                        {
                            const assignIRCodeLeft = genExpersionNodeForRValue(left);
                            const assignIRCodeRight = genExpersionNodeForRValue(right!);
                            methodSymbol.codes.push(createAssignIRCode(assignIRCodeLeft, assignIRCodeRight));

                            break;
                        }
                    }
                    break;
                }
                case SyntaxKind.IfStatement:
                {
                    const {condition, thenBlock, elseBlock} = statement;
                    const trueLabel = createLabelIRCode(globalLabels.getLabel());
                    const falseLabel = createLabelIRCode(globalLabels.getLabel());
                    const nextLabel = createLabelIRCode(globalLabels.getLabel());
                    genExpersionNodeForJump(
                        condition, trueLabel, falseLabel
                    );
                    methodSymbol.codes.push(trueLabel);
                    genBlockNode(thenBlock);
                    methodSymbol.codes.push(createJumpIRCode(nextLabel.label));
                    methodSymbol.codes.push(falseLabel);
                    if (elseBlock) {
                        methodSymbol.codes.push(falseLabel);
                        genBlockNode(elseBlock);
                    }
                    methodSymbol.codes.push(nextLabel);
                }
            }
        });
    }

    genBlockNode(methodDeclaration.body);

    methodSymbol.codes.push(createReturnIRCode());

    methodSymbol.localSize = 0 - symbolTable.getCurrentOffset();

    symbolTable.exitScope();

    return methodSymbol;
}

class StringConstantsPool {

    private readonly map = new Map<string, number>();

    get size() {
        return this.map.size;
    }

    getLabel(stringLiteral: string): string {
        if (this.map.has(stringLiteral)) {
            return `.msg${this.map.get(stringLiteral)}`;
        }
        this.map.set(stringLiteral, this.map.size);
        return `.msg${this.map.size - 1}`;
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
