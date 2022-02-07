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
    ArgumentNode,
    BinaryOperator,
    UnaryOperator,
    StatementNode,
    ForInitializerNode,
    ForIncrementNode,
    AssignmentStatementNode,
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
    | ExitIRCode
    | CallIRCode
    | ArgumentIRCode
    | AssignIRCode
    | UnaryIRCode
    | BinaryIRCode
    | LabelIRCode
    | ConditionalJumpIRCode
    | JumpIRCode
    | ArrayLocationIRCode;

interface EnterIRCode {
    type: IRCodeType.enter;
}

function createEnterIRCode(): EnterIRCode {
    return {type: IRCodeType.enter};
}

interface ReturnIRCode {
    type: IRCodeType.return;
    value?: ImmValue | TmpValue | IdentifierValue;
}

function createReturnIRCode(value?: ImmValue | TmpValue | IdentifierValue): ReturnIRCode {
    return {
        type: IRCodeType.return,
        value,
    };
}

interface ExitIRCode {
    type: IRCodeType.exit;
}

function createExitIRCode(): ExitIRCode {
    return {type: IRCodeType.exit};
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

export const enum ValueType {
    // 立即数
    Imm,
    // 临时变量
    Tmp,
    // 标识符
    Identifier,
    // 数组元素
    ArrayLocation,
    // 函数参数
    Parameter,
}

interface StringLiteralArgumentIRCode {
    type: IRCodeType.argument;
    kind: SyntaxKind.StringLiteral;
    label: string;
}

export interface IdentifierArgumentIRCode {
    type: IRCodeType.argument;
    kind: ValueType.Identifier;
    value: IdentifierValue;
}

interface LiteralArgumentIRCode {
    type: IRCodeType.argument;
    kind: ValueType.Imm;
    value: ImmValue;
}

interface TmpArgumentIRCode {
    type: IRCodeType.argument;
    kind: ValueType.Tmp;
    value: TmpValue;
}

interface ParameterArgumentIRCode {
    type: IRCodeType.argument;
    kind: ValueType.Parameter;
    value: ParameterValue;
}

export type ArgumentIRCode = StringLiteralArgumentIRCode
    | IdentifierArgumentIRCode | LiteralArgumentIRCode
    | TmpArgumentIRCode | ParameterArgumentIRCode;

function createArgumentIRCode(
    value: string | AssignmentIRCodeRigntValue
): ArgumentIRCode {
    if (typeof value === 'string') {
        return {
            type: IRCodeType.argument,
            kind: SyntaxKind.StringLiteral,
            label: value,
        };
    }
    return {
        type: IRCodeType.argument,
        kind: value.type,
        // @ts-expect-error
        value,
    };
}

interface ImmValue {
    type: ValueType.Imm;
    value: number;
}

interface TmpValue {
    type: ValueType.Tmp;
    name: string;
}

export interface IdentifierValue {
    type: ValueType.Identifier;
    name: string;
    offset: number;
}

interface ParameterValue {
    type: ValueType.Parameter;
    name: string;
    index: number;
}

interface ArrayLocationValue {
    type: ValueType.ArrayLocation;
    name: string;
    index: ImmValue | TmpValue | IdentifierValue | ParameterValue;
    typeSize: number;
    length: number;
    methodName: string;
    methodNameLength: number;
    offset: number;
}

type AssignmentIRCodeRigntValue = ImmValue | TmpValue | IdentifierValue | ParameterValue;

interface AssignIRCode {
    type: IRCodeType.assign;
    left: IdentifierValue | ParameterValue | ArrayLocationValue;
    right: AssignmentIRCodeRigntValue;
}

function createAssignIRCode(
    left: IdentifierValue | ParameterValue | ArrayLocationValue,
    right: AssignmentIRCodeRigntValue
): AssignIRCode {
    return {
        type: IRCodeType.assign,
        left,
        right,
    };
}

interface UnaryIRCode {
    type: IRCodeType.unary;
    operator: UnaryOperator;
    result: TmpValue;
    operand: TmpValue | ImmValue | IdentifierValue | ParameterValue;
}

function createUnaryIRCode(
    operator: UnaryOperator,
    result: TmpValue,
    operand: TmpValue | ImmValue | IdentifierValue | ParameterValue
): UnaryIRCode {
    return {
        type: IRCodeType.unary,
        operator,
        result,
        operand,
    };
}

interface BinaryIRCode {
    type: IRCodeType.binary;
    operator: BinaryOperator;
    result: TmpValue;
    left: TmpValue | ImmValue | IdentifierValue | ParameterValue;
    right: TmpValue | ImmValue | IdentifierValue | ParameterValue;
}

function createBinaryIRCode(
    operator: BinaryOperator,
    result: TmpValue,
    left: TmpValue | ImmValue | IdentifierValue | ParameterValue,
    right: TmpValue | ImmValue | IdentifierValue | ParameterValue
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
    left: TmpValue | ImmValue | IdentifierValue | ParameterValue;
    right: TmpValue | ImmValue | IdentifierValue | ParameterValue;
    targetLabel: string;
}

function createConditionalJumpIRCode(
    operator: BinaryOperator,
    left: TmpValue | ImmValue | IdentifierValue | ParameterValue,
    right: TmpValue | ImmValue | IdentifierValue | ParameterValue,
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

interface ArrayLocationIRCode {
    type: IRCodeType.arrayLocation;
    location: ArrayLocationValue;
    result: TmpValue;
}

function createArrayLocationIRCode(
    location: ArrayLocationValue,
    result: TmpValue
): ArrayLocationIRCode {
    return {
        type: IRCodeType.arrayLocation,
        location,
        result,
    };
}

interface FieldSymbol {
    name: string;
    typeSize: number;
    size: number;
}

function createFieldSymbol(node: VariableDeclarationNode): FieldSymbol {
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

interface ParameterInMethod {
    size: number;
    offset: number;
}

interface Method {
    name: string;
    parameters: Map<string, ParameterInMethod>;
    codes: IRPlainCode[];
    localSize: number;
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

    const symbolTable = new SymbolTable();
    symbolTable.enterScope('global');

    ast.fieldDeclarations.forEach(fieldDeclaration => {
        fieldDeclaration.declarations.forEach(declaration => {
            const globolSymbol = createFieldSymbol(declaration);
            programIR.globals.push(globolSymbol);

            symbolTable.addGlobal(globolSymbol.name, globolSymbol.typeSize, globolSymbol.size);
        });
    });

    function genMethodIR(
        methodDeclaration: MethodDeclarationNode,
        programIR: ProgramIR
    ) {

        if (methodDeclaration.returnType !== SyntaxKind.VoidKeyword) {
            programIR.enableReturnTypeCheck = true;
        }

        const breakLabelStack: string[] = [];
        const continueLabelStack: string[] = [];

        symbolTable.enterScope('block');

        const methodSymbol: Method = {
            name: methodDeclaration.name.name,
            parameters: new Map<string, ParameterInMethod>(),
            codes: [],
            localSize: 0,
        };

        const returnLabel = globalLabels.getLabel();

        function genArgumentList(argumentNodes: ArgumentNode[]) {

            const argumentBuffer: ArgumentIRCode[] = [];

            argumentNodes.forEach(argumentNode => {
                switch (argumentNode.kind) {
                    case SyntaxKind.StringLiteral:
                    {
                        const label = programIR.constants.getLabel(argumentNode.value);
                        argumentBuffer.push(
                            createArgumentIRCode(label)
                        );
                        break;
                    }
                    case SyntaxKind.IntLiteral:
                    case SyntaxKind.TrueKeyword:
                    case SyntaxKind.FalseKeyword:
                    case SyntaxKind.Identifier:
                    case SyntaxKind.CallExpression:
                    case SyntaxKind.ArrayLocation:
                    case SyntaxKind.BinaryExpression:
                    case SyntaxKind.UnaryExpression:
                    {
                        const rvalue = genExpersionNodeForRValue(argumentNode);
                        if (rvalue.type !== ValueType.Tmp) {
                            argumentBuffer.push(
                                createArgumentIRCode(rvalue)
                            );
                            break;
                        }
                        // 由于参数可能很多，因此构造临时的 identifier，在内存中保存参数
                        const stackValue = symbolTable.addStackVariable();
                        const identifierValue: IdentifierValue = {
                            type: ValueType.Identifier,
                            name: stackValue.name,
                            offset: stackValue.offset,
                        };
                        methodSymbol.codes.push(
                            createAssignIRCode(identifierValue, rvalue)
                        );
                        argumentBuffer.push(
                            createArgumentIRCode(identifierValue)
                        );
                        break;
                    }
                }
            });

            argumentBuffer.forEach(code => {
                methodSymbol.codes.push(code);
            });
        }

        function genExpersionNodeForRValue(node: ExpressionNode): AssignmentIRCodeRigntValue {
            switch (node.kind) {
                case SyntaxKind.TrueKeyword:
                case SyntaxKind.FalseKeyword:
                {
                    return {
                        type: ValueType.Imm,
                        value: node.value ? 1 : 0,
                    };
                }
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
                            // @todo 用这个 offset 代表 global
                            offset = 200;
                            break;
                        case 'local':
                            offset = symbol.offset;
                            break;
                        case 'parameter':
                        {
                            return {
                                type: ValueType.Parameter,
                                name: node.name,
                                index: symbol.index,
                            };
                        }
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

                    const tmpValue = {
                        type: ValueType.Tmp,
                        name: symbolTable.addTmpVariable(),
                    } as const;
                    methodSymbol.codes.push(
                        createUnaryIRCode(operator, tmpValue, operandGen)
                    );
                    return tmpValue;
                }
                case SyntaxKind.CallExpression:
                {
                    const {callee} = node;

                    if (callee.name === 'len') {
                        const argumentNode = node.arguments[0];
                        if (!argumentNode || argumentNode.kind !== SyntaxKind.Identifier) {
                            throw new Error('unexpected');
                        }
                        const symbol = symbolTable.find(argumentNode.name)!;
                        if (symbol.kind !== 'global' && symbol.kind !== 'local') {
                            throw new Error('unexpected');
                        }
                        const length = Math.floor(symbol.size / symbol.typeSize);
                        const imm: ImmValue = {
                            type: ValueType.Imm,
                            value: length,
                        };
                        return imm;
                    }

                    genArgumentList(node.arguments);

                    methodSymbol.codes.push(
                        createCallIRCode(callee.name, node.arguments.length)
                    );

                    const tmpValue = {
                        type: ValueType.Tmp,
                        name: 'returnValue',
                    } as const;

                    // 由于存在 call(1) + call(2) 这样的情况，
                    // 因此构造临时的 identifier，在内存中保存返回值
                    // 防止连续调用的情况下 %rax 相互覆盖
                    const stackValue = symbolTable.addStackVariable();
                    const identifierValue: IdentifierValue = {
                        type: ValueType.Identifier,
                        name: stackValue.name,
                        offset: stackValue.offset,
                    };
                    methodSymbol.codes.push(
                        createAssignIRCode(identifierValue, tmpValue)
                    );
                    return identifierValue;
                }
                case SyntaxKind.ArrayLocation:
                {
                    const {name, index} = node;
                    const indexRValue = genExpersionNodeForRValue(index);
                    const symbol = symbolTable.find(name.name);
                    if (!symbol) {
                        throw new Error('unexpected');
                    }
                    if (symbol.kind !== 'global' && symbol.kind !== 'local') {
                        throw new Error('unexpected');
                    }
                    programIR.enbaleArrayBoundCheck = true;
                    const label = programIR.constants.getLabel(`"${methodSymbol.name}"`);
                    const location: ArrayLocationValue = {
                        type: ValueType.ArrayLocation,
                        name: name.name,
                        index: indexRValue,
                        typeSize: symbol.typeSize,
                        length: Math.floor(symbol.size / symbol.typeSize),
                        methodName: label,
                        methodNameLength: methodSymbol.name.length,
                        offset: symbol.kind === 'global' ? 200 : symbol.offset,
                    };
                    const tmpValue = {
                        type: ValueType.Tmp,
                        name: symbolTable.addTmpVariable(),
                    } as const;
                    methodSymbol.codes.push(createArrayLocationIRCode(
                        location,
                        tmpValue
                    ));
                    return tmpValue;
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
                case SyntaxKind.CallExpression:
                case SyntaxKind.UnaryExpression:
                case SyntaxKind.Identifier:
                {
                    // 无论如何，就算子节点里面有控制流，到比较大小这一步，都需要的是 rvalue
                    const left = genExpersionNodeForRValue(node);
                    const right: ImmValue = {
                        type: ValueType.Imm,
                        value: 0,
                    };
                    methodSymbol.codes.push(createConditionalJumpIRCode(
                        SyntaxKind.ExclamationEqualsToken,
                        left,
                        right,
                        trueLabel.label
                    ));
                    methodSymbol.codes.push(createJumpIRCode(falseLabel.label));
                    break;
                }
                default:
                    throw new Error('todo');
            }
        }

        methodDeclaration.parameters.forEach((parameter, index) => {
            const size = parameter.type === SyntaxKind.IntKeyword ? 8 : 1;
            const offset = symbolTable.addParameterSymbol(parameter.name.name, index, size);
            if (index < 6) {
                methodSymbol.parameters.set(parameter.name.name, {
                    size,
                    offset,
                });
            }
        });

        methodSymbol.codes.push(createEnterIRCode());

        function genStatement(statement: StatementNode | ForInitializerNode | ForIncrementNode) {
            switch (statement.kind) {
                case SyntaxKind.CallStatement:
                {
                    const {callee} = statement.expression;

                    genArgumentList(statement.expression.arguments);

                    methodSymbol.codes.push(
                        createCallIRCode(callee.name, statement.expression.arguments.length)
                    );

                    break;
                }
                case SyntaxKind.AssignmentStatement:
                {
                    const {left, right, operator, pos, end} = statement;
                    switch (operator) {
                        case SyntaxKind.EqualsToken:
                        {
                            // eslint-disable-next-line @typescript-eslint/init-declarations
                            let assignIRCodeLeft: IdentifierValue | ParameterValue | ArrayLocationValue;
                            outer: switch (left.kind) {
                                case SyntaxKind.Identifier:
                                {
                                    const symbol = symbolTable.find(left.name);

                                    if (!symbol) {
                                        throw new Error('unexpected');
                                    }

                                    let offset: number = 0;

                                    switch (symbol.kind) {
                                        case 'global':
                                            // @todo 用这个 offset 代表 global
                                            offset = 200;
                                            break;
                                        case 'local':
                                            offset = symbol.offset;
                                            break;
                                        case 'parameter':
                                        {
                                            assignIRCodeLeft = {
                                                type: ValueType.Parameter,
                                                name: left.name,
                                                index: symbol.index,
                                            };
                                            break outer;
                                        }
                                        default:
                                            throw new Error('unexpected');
                                    }
                                    assignIRCodeLeft = {
                                        type: ValueType.Identifier,
                                        name: left.name,
                                        offset,
                                    };
                                    break;
                                }
                                case SyntaxKind.ArrayLocation:
                                {
                                    const {name, index} = left;
                                    const indexRValue = genExpersionNodeForRValue(index);
                                    const symbol = symbolTable.find(name.name);
                                    if (!symbol) {
                                        throw new Error('unexpected');
                                    }
                                    if (symbol.kind !== 'global' && symbol.kind !== 'local') {
                                        throw new Error('unexpected');
                                    }
                                    const label = programIR.constants.getLabel(`"${methodSymbol.name}"`);
                                    programIR.enbaleArrayBoundCheck = true;
                                    assignIRCodeLeft = {
                                        type: ValueType.ArrayLocation,
                                        name: name.name,
                                        index: indexRValue,
                                        typeSize: symbol.typeSize,
                                        length: Math.floor(symbol.size / symbol.typeSize),
                                        methodName: label,
                                        methodNameLength: methodSymbol.name.length,
                                        offset: symbol.kind === 'global' ? 200 : symbol.offset,
                                    };
                                    break;
                                }
                            }
                            const assignIRCodeRight = genExpersionNodeForRValue(right!);
                            methodSymbol.codes.push(createAssignIRCode(assignIRCodeLeft, assignIRCodeRight));

                            break;
                        }
                        case SyntaxKind.PlusEqualsToken:
                        {
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left,
                                right: {
                                    kind: SyntaxKind.BinaryExpression,
                                    left,
                                    right: right!,
                                    operator: SyntaxKind.PlusToken,
                                    pos,
                                    end,
                                },
                                pos,
                                end,
                            });
                            break;
                        }
                        case SyntaxKind.MinusEqualsToken:
                        {
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left,
                                right: {
                                    kind: SyntaxKind.BinaryExpression,
                                    left,
                                    right: right!,
                                    operator: SyntaxKind.MinusToken,
                                    pos,
                                    end,
                                },
                                pos,
                                end,
                            });
                            break;
                        }
                        case SyntaxKind.PlusPlusToken:
                        {
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left,
                                right: {
                                    kind: SyntaxKind.BinaryExpression,
                                    left,
                                    right: {
                                        kind: SyntaxKind.IntLiteral,
                                        value: '1',
                                        pos,
                                        end,
                                    },
                                    operator: SyntaxKind.PlusToken,
                                    pos,
                                    end,
                                },
                                pos,
                                end,
                            });
                            break;
                        }
                        case SyntaxKind.MinusMinusToken:
                        {
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left,
                                right: {
                                    kind: SyntaxKind.BinaryExpression,
                                    left,
                                    right: {
                                        kind: SyntaxKind.IntLiteral,
                                        value: '1',
                                        pos,
                                        end,
                                    },
                                    operator: SyntaxKind.MinusToken,
                                    pos,
                                    end,
                                },
                                pos,
                                end,
                            });
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
                    break;
                }
                case SyntaxKind.ReturnStatement:
                {
                    const {expression} = statement;
                    if (expression) {
                        const value = genExpersionNodeForRValue(expression);
                        // @ts-expect-error 我没有处理 ArrayLocation
                        methodSymbol.codes.push(createReturnIRCode(value));
                    }
                    methodSymbol.codes.push(createJumpIRCode(returnLabel));
                    break;
                }
                case SyntaxKind.ForInitializer:
                {
                    const {declaration, expression} = statement;

                    const assignIRCodeLeft = genExpersionNodeForRValue(declaration);
                    const assignIRCodeRight = genExpersionNodeForRValue(expression);
                    // @ts-expect-error
                    methodSymbol.codes.push(createAssignIRCode(assignIRCodeLeft, assignIRCodeRight));

                    break;
                }
                case SyntaxKind.ForIncrement:
                {
                    const assignStmt: AssignmentStatementNode = {
                        kind: SyntaxKind.AssignmentStatement,
                        left: statement.declaration,
                        right: statement.expression,
                        operator: statement.operator,
                        pos: statement.pos,
                        end: statement.end,
                    };
                    genStatement(assignStmt);
                    break;
                }
                case SyntaxKind.ForStatement:
                {
                    const conditionLabel = globalLabels.getLabel();
                    const bodyLabel = globalLabels.getLabel();
                    const incrementLabel = globalLabels.getLabel();
                    const nextLabel = globalLabels.getLabel();

                    breakLabelStack.push(nextLabel);
                    continueLabelStack.push(incrementLabel);

                    genStatement(statement.initializer);
                    methodSymbol.codes.push(createJumpIRCode(conditionLabel));

                    const bodyLabelIRCode = createLabelIRCode(bodyLabel);
                    methodSymbol.codes.push(bodyLabelIRCode);
                    genBlockNode(statement.body);

                    const incrementLabelIRCode = createLabelIRCode(incrementLabel);
                    methodSymbol.codes.push(incrementLabelIRCode);
                    genStatement(statement.increment);

                    methodSymbol.codes.push(createLabelIRCode(conditionLabel));
                    const nextLabelIRCode = createLabelIRCode(nextLabel);
                    genExpersionNodeForJump(
                        statement.condition,
                        bodyLabelIRCode,
                        nextLabelIRCode
                    );
                    methodSymbol.codes.push(nextLabelIRCode);

                    breakLabelStack.pop();
                    continueLabelStack.pop();

                    break;
                }
                case SyntaxKind.WhileStatement:
                {
                    const beginLabel = globalLabels.getLabel();
                    const bodyLabel = globalLabels.getLabel();
                    const nextLabel = globalLabels.getLabel();

                    breakLabelStack.push(nextLabel);
                    continueLabelStack.push(beginLabel);

                    methodSymbol.codes.push(createLabelIRCode(beginLabel));

                    const bodyLabelIRCode = createLabelIRCode(bodyLabel);
                    const nextLabelIRCode = createLabelIRCode(nextLabel);

                    genExpersionNodeForJump(
                        statement.condition,
                        bodyLabelIRCode,
                        nextLabelIRCode
                    );

                    methodSymbol.codes.push(bodyLabelIRCode);

                    genBlockNode(statement.body);
                    methodSymbol.codes.push(createJumpIRCode(beginLabel));
                    methodSymbol.codes.push(nextLabelIRCode);

                    breakLabelStack.pop();
                    continueLabelStack.pop();

                    break;
                }
                case SyntaxKind.BreakStatement:
                {
                    const breakLabel = breakLabelStack[breakLabelStack.length - 1];
                    methodSymbol.codes.push(createJumpIRCode(breakLabel));
                    break;
                }
                case SyntaxKind.ContinueStatement:
                {
                    const continueLabel = continueLabelStack[continueLabelStack.length - 1];
                    methodSymbol.codes.push(createJumpIRCode(continueLabel));
                    break;
                }
            }
        }

        function genBlockNode(node: BlockNode) {
            symbolTable.enterScope('block');
            node.fields.forEach(field => {
                const type = field.type;
                const typeSize = type === SyntaxKind.IntKeyword ? 8 : 1;
                field.declarations.forEach(declaration => {
                    if (declaration.kind === SyntaxKind.Identifier) {
                        symbolTable.addLocal(declaration.name, typeSize, typeSize);
                    }
                    else {
                        const name = declaration.name.name;
                        const length = declaration.size.value.startsWith('0x')
                            ? parseInt(declaration.size.value, 16)
                            : parseInt(declaration.size.value, 10);
                        symbolTable.addLocal(name, typeSize, length * typeSize);
                    }
                });
            });

            node.statements.forEach(statement => {
                genStatement(statement);
            });
            symbolTable.exitScope();
        }

        genBlockNode(methodDeclaration.body);

        if (methodSymbol.name === 'main') {
            methodSymbol.codes.push(createReturnIRCode({
                type: ValueType.Imm,
                value: 0,
            }));
        }

        methodSymbol.codes.push(createLabelIRCode(returnLabel));
        methodSymbol.codes.push(createExitIRCode());

        methodSymbol.localSize = 0 - symbolTable.getCurrentOffset();

        symbolTable.exitScope();

        return methodSymbol;
    }

    ast.methodDeclarations.forEach(methodDeclaration => {
        const methodSymbol = genMethodIR(methodDeclaration, programIR);
        programIR.methods.push(methodSymbol);
    });

    symbolTable.exitScope();

    return programIR;
}
