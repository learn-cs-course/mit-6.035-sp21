/**
 * @file 生成三地址码形式的中间表示
 */

import {
    ProgramNode,
    SyntaxKind,
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
    IdentifierNode,
} from '../types/grammar';
import {createFieldSymbol} from './createFieldSymbol';
import {
    ImmValue,
    ValueType,
    ArgumentIRCode,
    createArgumentIRCode,
    IdentifierValue,
    createAssignIRCode,
    AssignmentIRCodeRigntValue,
    createBinaryIRCode,
    createConditionalJumpIRCode,
    createJumpIRCode,
    createLabelIRCode,
    createUnaryIRCode,
    createCallIRCode,
    ArrayLocationValue,
    createArrayLocationIRCode,
    LabelIRCode,
    createEnterIRCode,
    ParameterValue,
    createReturnIRCode,
    createFunctionReturnCheckIRCode,
    createExitIRCode,
} from './irCode';
import {ProgramIR, Method, ParameterInMethod} from './ProgramIR';
import {StringConstantsPool} from './StringConstantsPool';
import {SymbolTable} from './symbolTable';
import {optimaze} from './optimaze';

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

export function genIR(ast: ProgramNode) {
    const programIR: ProgramIR = {
        globals: [],
        constants: new StringConstantsPool(),
        methods: [],
        enableArrayBoundCheck: false,
        enableReturnCheck: false,
    };

    const globalLabels = new JumpLabels();

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

        const breakLabelStack: string[] = [];
        const continueLabelStack: string[] = [];

        symbolTable.enterScope('block');

        const methodSymbol: Method = {
            name: methodDeclaration.name.name,
            parameters: new Map<string, ParameterInMethod>(),
            codes: [],
            localSize: 0,
            enableReturnCheck: methodDeclaration.returnType !== SyntaxKind.VoidKeyword,
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
                case SyntaxKind.CharLiteral:
                {
                    return {
                        type: ValueType.Imm,
                        // 因为 value 的字符串有单引号包着，所以 index 取 1
                        value: node.value.charCodeAt(1),
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

                    const leftGen = genExpersionNodeForRValue(left);
                    const rightGen = genExpersionNodeForRValue(right);

                    // 预先计算
                    if (leftGen.type === ValueType.Imm && rightGen.type === ValueType.Imm) {
                        return calcBinaryExpression(leftGen, rightGen, operator);
                    }

                    switch (operator) {
                        case SyntaxKind.PlusToken:
                        case SyntaxKind.MinusToken:
                        case SyntaxKind.AsteriskToken:
                        case SyntaxKind.SlashToken:
                        case SyntaxKind.PercentToken:
                        {
                            const tmpValue = {
                                type: ValueType.Tmp,
                                name: symbolTable.addTmpVariable(),
                            } as const;
                            methodSymbol.codes.push(createBinaryIRCode(operator, tmpValue, leftGen, rightGen));
                            return tmpValue;
                        }
                        case SyntaxKind.GreaterThanToken:
                        case SyntaxKind.LessThanToken:
                        case SyntaxKind.GreaterThanEqualsToken:
                        case SyntaxKind.LessThanEqualsToken:
                        case SyntaxKind.EqualsEqualsToken:
                        case SyntaxKind.ExclamationEqualsToken:
                        {
                            const stackValue = symbolTable.addStackVariable();
                            const identifierValue: IdentifierValue = {
                                type: ValueType.Identifier,
                                name: stackValue.name,
                                offset: stackValue.offset,
                            };
                            const trueLabel = globalLabels.getLabel();
                            const falseLabel = globalLabels.getLabel();
                            const nextLabel = globalLabels.getLabel();
                            methodSymbol.codes.push(createConditionalJumpIRCode(
                                node.operator,
                                leftGen,
                                rightGen,
                                trueLabel
                            ));
                            methodSymbol.codes.push(createJumpIRCode(falseLabel));
                            methodSymbol.codes.push(createLabelIRCode(trueLabel));
                            methodSymbol.codes.push(createAssignIRCode(identifierValue, {
                                type: ValueType.Imm,
                                value: 1,
                            }));
                            methodSymbol.codes.push(createJumpIRCode(nextLabel));
                            methodSymbol.codes.push(createLabelIRCode(falseLabel));
                            methodSymbol.codes.push(createAssignIRCode(identifierValue, {
                                type: ValueType.Imm,
                                value: 0,
                            }));
                            methodSymbol.codes.push(createLabelIRCode(nextLabel));
                            return identifierValue;
                        }
                        case SyntaxKind.AmpersandAmpersandToken:
                        {
                            const stackValue = symbolTable.addStackVariable();
                            const identifierValue: IdentifierValue = {
                                type: ValueType.Identifier,
                                name: stackValue.name,
                                offset: stackValue.offset,
                            };
                            const trueLabel = globalLabels.getLabel();
                            const falseLabel = globalLabels.getLabel();
                            const nextLabel = globalLabels.getLabel();

                            const newTrueLabel = globalLabels.getLabel();
                            const newTrueLabelIRCode = createLabelIRCode(newTrueLabel);

                            methodSymbol.codes.push(createConditionalJumpIRCode(
                                SyntaxKind.EqualsEqualsToken,
                                leftGen,
                                {
                                    type: ValueType.Imm,
                                    value: 1,
                                },
                                newTrueLabel
                            ));
                            methodSymbol.codes.push(createJumpIRCode(falseLabel));

                            methodSymbol.codes.push(newTrueLabelIRCode);

                            methodSymbol.codes.push(createConditionalJumpIRCode(
                                SyntaxKind.EqualsEqualsToken,
                                rightGen,
                                {
                                    type: ValueType.Imm,
                                    value: 1,
                                },
                                trueLabel
                            ));
                            methodSymbol.codes.push(createJumpIRCode(falseLabel));

                            methodSymbol.codes.push(createLabelIRCode(trueLabel));
                            methodSymbol.codes.push(createAssignIRCode(identifierValue, {
                                type: ValueType.Imm,
                                value: 1,
                            }));
                            methodSymbol.codes.push(createJumpIRCode(nextLabel));
                            methodSymbol.codes.push(createLabelIRCode(falseLabel));
                            methodSymbol.codes.push(createAssignIRCode(identifierValue, {
                                type: ValueType.Imm,
                                value: 0,
                            }));
                            methodSymbol.codes.push(createLabelIRCode(nextLabel));
                            return identifierValue;
                        }
                        case SyntaxKind.BarBarToken:
                        {
                            const stackValue = symbolTable.addStackVariable();
                            const identifierValue: IdentifierValue = {
                                type: ValueType.Identifier,
                                name: stackValue.name,
                                offset: stackValue.offset,
                            };

                            const trueLabel = globalLabels.getLabel();
                            const falseLabel = globalLabels.getLabel();
                            const nextLabel = globalLabels.getLabel();

                            const newFalseLabel = globalLabels.getLabel();
                            const newFalseLabelIRCode = createLabelIRCode(newFalseLabel);

                            methodSymbol.codes.push(createConditionalJumpIRCode(
                                SyntaxKind.EqualsEqualsToken,
                                leftGen,
                                {
                                    type: ValueType.Imm,
                                    value: 1,
                                },
                                trueLabel
                            ));
                            methodSymbol.codes.push(createJumpIRCode(newFalseLabel));

                            methodSymbol.codes.push(newFalseLabelIRCode);

                            methodSymbol.codes.push(createConditionalJumpIRCode(
                                SyntaxKind.EqualsEqualsToken,
                                rightGen,
                                {
                                    type: ValueType.Imm,
                                    value: 1,
                                },
                                trueLabel
                            ));
                            methodSymbol.codes.push(createJumpIRCode(falseLabel));

                            methodSymbol.codes.push(createLabelIRCode(trueLabel));
                            methodSymbol.codes.push(createAssignIRCode(identifierValue, {
                                type: ValueType.Imm,
                                value: 1,
                            }));
                            methodSymbol.codes.push(createJumpIRCode(nextLabel));
                            methodSymbol.codes.push(createLabelIRCode(falseLabel));
                            methodSymbol.codes.push(createAssignIRCode(identifierValue, {
                                type: ValueType.Imm,
                                value: 0,
                            }));
                            methodSymbol.codes.push(createLabelIRCode(nextLabel));
                            return identifierValue;
                        }
                    }
                    break;
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
                    programIR.enableArrayBoundCheck = true;
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
            const size = parameter.type === SyntaxKind.IntKeyword ? 8 : 8;
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
                            // 右结合
                            const assignIRCodeRight = genExpersionNodeForRValue(right!);
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
                                    programIR.enableArrayBoundCheck = true;
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
                            methodSymbol.codes.push(createAssignIRCode(assignIRCodeLeft, assignIRCodeRight));

                            break;
                        }
                        case SyntaxKind.PlusEqualsToken:
                        {
                            if (left.kind === SyntaxKind.Identifier) {
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
                            // a[inc(1)] += inc(5)
                            // right = inc(5)
                            const stackValueRight = symbolTable.addStackVariable();
                            const rightIdentifierNode: IdentifierNode = {
                                kind: SyntaxKind.Identifier,
                                name: stackValueRight.name,
                                pos,
                                end,
                            };
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: rightIdentifierNode,
                                right,
                                pos,
                                end,
                            });

                            // index = inc(1)
                            const stackValueIndex = symbolTable.addStackVariable();
                            const indexIdentifierNode: IdentifierNode = {
                                kind: SyntaxKind.Identifier,
                                name: stackValueIndex.name,
                                pos,
                                end,
                            };
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: indexIdentifierNode,
                                right: left.index,
                                pos,
                                end,
                            });

                            // a[index] = a[index] + right
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: {
                                    ...left,
                                    index: indexIdentifierNode,
                                },
                                right: {
                                    kind: SyntaxKind.BinaryExpression,
                                    left: {
                                        ...left,
                                        index: indexIdentifierNode,
                                    },
                                    right: rightIdentifierNode,
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
                            if (left.kind === SyntaxKind.Identifier) {
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

                            const stackValueRight = symbolTable.addStackVariable();
                            const rightIdentifierNode: IdentifierNode = {
                                kind: SyntaxKind.Identifier,
                                name: stackValueRight.name,
                                pos,
                                end,
                            };
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: rightIdentifierNode,
                                right,
                                pos,
                                end,
                            });

                            const stackValueIndex = symbolTable.addStackVariable();
                            const indexIdentifierNode: IdentifierNode = {
                                kind: SyntaxKind.Identifier,
                                name: stackValueIndex.name,
                                pos,
                                end,
                            };
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: indexIdentifierNode,
                                right: left.index,
                                pos,
                                end,
                            });

                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: {
                                    ...left,
                                    index: indexIdentifierNode,
                                },
                                right: {
                                    kind: SyntaxKind.BinaryExpression,
                                    left: {
                                        ...left,
                                        index: indexIdentifierNode,
                                    },
                                    right: rightIdentifierNode,
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
                            if (left.kind === SyntaxKind.Identifier) {
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

                            const stackValueIndex = symbolTable.addStackVariable();
                            const indexIdentifierNode: IdentifierNode = {
                                kind: SyntaxKind.Identifier,
                                name: stackValueIndex.name,
                                pos,
                                end,
                            };
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: indexIdentifierNode,
                                right: left.index,
                                pos,
                                end,
                            });

                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: {
                                    ...left,
                                    index: indexIdentifierNode,
                                },
                                right: {
                                    kind: SyntaxKind.BinaryExpression,
                                    left: {
                                        ...left,
                                        index: indexIdentifierNode,
                                    },
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
                                    operator: SyntaxKind.MinusToken,
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
                            if (left.kind === SyntaxKind.Identifier) {
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

                            const stackValueIndex = symbolTable.addStackVariable();
                            const indexIdentifierNode: IdentifierNode = {
                                kind: SyntaxKind.Identifier,
                                name: stackValueIndex.name,
                                pos,
                                end,
                            };
                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: indexIdentifierNode,
                                right: left.index,
                                pos,
                                end,
                            });

                            genStatement({
                                kind: SyntaxKind.AssignmentStatement,
                                operator: SyntaxKind.EqualsToken,
                                left: {
                                    ...left,
                                    index: indexIdentifierNode,
                                },
                                right: {
                                    kind: SyntaxKind.BinaryExpression,
                                    left: {
                                        ...left,
                                        index: indexIdentifierNode,
                                    },
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
                const typeSize = type === SyntaxKind.IntKeyword ? 8 : 8;
                field.declarations.forEach(declaration => {
                    if (declaration.kind === SyntaxKind.Identifier) {
                        const localSymbol = symbolTable.addLocal(declaration.name, typeSize, typeSize);
                        methodSymbol.codes.push(
                            createAssignIRCode(
                                {
                                    type: ValueType.Identifier,
                                    name: declaration.name,
                                    offset: localSymbol.offset,
                                },
                                {
                                    type: ValueType.Imm,
                                    value: 0,
                                }
                            )
                        );
                    }
                    else {
                        const name = declaration.name.name;
                        const length = declaration.size.value.startsWith('0x')
                            ? parseInt(declaration.size.value, 16)
                            : parseInt(declaration.size.value, 10);
                        const localSymbol = symbolTable.addLocal(name, typeSize, length * typeSize);

                        for (let i = 0; i < length; i++) {
                            const label = programIR.constants.getLabel(`"${methodSymbol.name}"`);
                            const arrayLocation: ArrayLocationValue = {
                                type: ValueType.ArrayLocation,
                                name: localSymbol.name,
                                index: {
                                    type: ValueType.Imm,
                                    value: i,
                                },
                                typeSize,
                                length,
                                methodName: label,
                                methodNameLength: methodSymbol.name.length,
                                offset: localSymbol.offset,
                            };
                            methodSymbol.codes.push(
                                createAssignIRCode(
                                    arrayLocation,
                                    {
                                        type: ValueType.Imm,
                                        value: 0,
                                    }
                                )
                            );
                        }
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

        if (methodSymbol.enableReturnCheck) {
            programIR.enableReturnCheck = true;
            const label = programIR.constants.getLabel(`"${methodSymbol.name}"`);
            methodSymbol.codes.push(
                createFunctionReturnCheckIRCode(label, methodSymbol.name.length)
            );
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

    optimaze(programIR);

    return programIR;
}
