import {
    ProgramNode,
    SyntaxKind,
    Type,
    MethodDeclarationNode,
    IRCodeType,
    BlockNode,
    FieldDeclarationNode,
    ExpressionNode,
    ArgumentNode,
    StatementNode,
    ForInitializerNode,
    ForIncrementNode,
    AssignmentStatementNode,
    IdentifierNode,
    LocationNode,
} from '../types/grammar';
import {
    ProgramIR,
    JumpLabels,
    SymbolTable,
    getSymbolFromDeclaration,
    MethodIR,
    ParameterSymbol,
    ValueKind,
    ArrayLocationValue,
    LiteralValue,
    LabelIRCode,
    IdentifierValue,
    StringValue,
} from './irCode';

export function genIR(ast: ProgramNode): ProgramIR {
    const programIR: ProgramIR = {
        globals: [],
        methods: [],
        enableArrayBoundCheck: false,
        enableReturnCheck: false,
    };

    const globalLabels = new JumpLabels();

    const symbolTable = new SymbolTable();
    symbolTable.enterScope('global');

    ast.fieldDeclarations.forEach(fieldDeclaration => {
        fieldDeclaration.declarations.forEach(declaration => {
            const symbol = getSymbolFromDeclaration(declaration);
            const globalSymbol = symbolTable.addGlobal(symbol.name, symbol.type, symbol.isArray, symbol.length);
            programIR.globals.push(globalSymbol);
        });
    });

    ast.methodDeclarations.forEach(methodDeclaration => {
        const methodIR = genMethodIR(methodDeclaration);
        programIR.methods.push(methodIR);
    });

    symbolTable.exitScope();

    return programIR;

    function genMethodIR(methodDeclaration: MethodDeclarationNode): MethodIR {

        const breakLabelStack: string[] = [];
        const continueLabelStack: string[] = [];

        symbolTable.enterScope('block');
        const methodIR: MethodIR = {
            name: methodDeclaration.name.name,
            parameters: new Map<string, ParameterSymbol>(),
            codes: [],
            enableReturnCheck: methodDeclaration.returnType !== SyntaxKind.VoidKeyword,
        };

        const returnLabel = globalLabels.getLabel();

        methodDeclaration.parameters.forEach((parameter, index) => {
            const type = parameter.type === SyntaxKind.IntKeyword ? 'int' : 'bool';
            const symbol = symbolTable.addParameterSymbol(parameter.name.name, type, index);
            methodIR.parameters.set(parameter.name.name, symbol);
        });

        methodIR.codes.push({type: IRCodeType.enter});

        genBlockNode(methodDeclaration.body);

        if (methodIR.name === 'main') {
            methodIR.codes.push({
                type: IRCodeType.return,
                value: {
                    kind: ValueKind.Literal,
                    type: 'int',
                    value: 0,
                },
            });
            methodIR.codes.push({
                type: IRCodeType.jump,
                targetLabel: returnLabel,
            });
        }

        if (methodIR.enableReturnCheck) {
            programIR.enableReturnCheck = true;
            methodIR.codes.push({
                type: IRCodeType.functionReturnCheck,
            });
        }

        methodIR.codes.push({
            type: IRCodeType.label,
            label: returnLabel,
        });
        methodIR.codes.push({
            type: IRCodeType.exit,
        });

        symbolTable.exitScope();

        return methodIR;

        function genBlockNode(node: BlockNode) {
            symbolTable.enterScope('block');
            node.fields.forEach(field => {
                genFieldDeclarationNode(field);
            });

            node.statements.forEach(statement => {
                genStatement(statement);
            });
            symbolTable.exitScope();
        }

        function genFieldDeclarationNode(field: FieldDeclarationNode) {
            field.declarations.forEach(declaration => {
                const symbol = getSymbolFromDeclaration(declaration);
                const localSymbol = symbolTable.addLocal(symbol.name, symbol.type, symbol.isArray, symbol.length);

                // 下面的代码用于生成变量的值的初始化代码，即所有变量初始化为 0
                if (!localSymbol.isArray) {
                    methodIR.codes.push({
                        type: IRCodeType.assign,
                        left: {
                            kind: ValueKind.Identifier,
                            symbol: localSymbol,
                        },
                        right: {
                            kind: ValueKind.Literal,
                            type: localSymbol.type,
                            value: 0,
                        },
                    });
                    return;
                }
                // 对于数组，有多少 length 生成多少 assign ir code
                const {length} = localSymbol;
                for (let i = 0; i < length; i++) {
                    const arrayLocation: ArrayLocationValue = {
                        kind: ValueKind.ArrayLocation,
                        symbol: localSymbol,
                        index: {
                            kind: ValueKind.Literal,
                            type: 'int',
                            value: i,
                        },
                        enableArrayBoundCheck: false,
                    };
                    const value: LiteralValue = {
                        kind: ValueKind.Literal,
                        type: localSymbol.type,
                        value: 0,
                    };
                    methodIR.codes.push({
                        type: IRCodeType.assign,
                        left: arrayLocation,
                        right: value,
                    });
                }
            });
        }

        function genStatement(statement: StatementNode | ForInitializerNode | ForIncrementNode) {
            switch (statement.kind) {
                case SyntaxKind.CallStatement:
                {
                    const {callee} = statement.expression;
                    const argumentList = genArgumentList(statement.expression.arguments);

                    methodIR.codes.push({
                        type: IRCodeType.call,
                        name: callee.name,
                        args: argumentList,
                        needReturnValue: false,
                    });
                    break;
                }
                case SyntaxKind.IfStatement:
                {
                    const {condition, thenBlock, elseBlock} = statement;
                    const trueLabel: LabelIRCode = {
                        type: IRCodeType.label,
                        label: globalLabels.getLabel(),
                    };
                    const falseLabel: LabelIRCode = {
                        type: IRCodeType.label,
                        label: globalLabels.getLabel(),
                    };
                    const nextLabel: LabelIRCode = {
                        type: IRCodeType.label,
                        label: globalLabels.getLabel(),
                    };
                    genExpersionNodeForJump(
                        condition, trueLabel, falseLabel
                    );
                    methodIR.codes.push(trueLabel);
                    genBlockNode(thenBlock);
                    methodIR.codes.push({
                        type: IRCodeType.jump,
                        targetLabel: nextLabel.label,
                    });
                    methodIR.codes.push(falseLabel);
                    if (elseBlock) {
                        methodIR.codes.push(falseLabel);
                        genBlockNode(elseBlock);
                    }
                    methodIR.codes.push(nextLabel);
                    break;
                }
                case SyntaxKind.ReturnStatement:
                {
                    const {expression} = statement;
                    if (expression) {
                        const value = genExpersionNodeForRValue(expression);
                        methodIR.codes.push({
                            type: IRCodeType.return,
                            value,
                        });
                    }
                    methodIR.codes.push({
                        type: IRCodeType.jump,
                        targetLabel: returnLabel,
                    });
                    break;
                }
                case SyntaxKind.ForInitializer:
                {
                    const {declaration, expression} = statement;

                    const left = genExpersionNodeForRValue(declaration);
                    const right = genExpersionNodeForRValue(expression);
                    if (left.kind === ValueKind.Literal) {
                        throw new Error('unexpected');
                    }
                    methodIR.codes.push({
                        type: IRCodeType.assign,
                        left,
                        right,
                    });
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
                    methodIR.codes.push({
                        type: IRCodeType.jump,
                        targetLabel: conditionLabel,
                    });

                    const bodyLabelIRCode: LabelIRCode = {
                        type: IRCodeType.label,
                        label: bodyLabel,
                    };
                    methodIR.codes.push(bodyLabelIRCode);
                    genBlockNode(statement.body);

                    const incrementLabelIRCode: LabelIRCode = {
                        type: IRCodeType.label,
                        label: incrementLabel,
                    };
                    methodIR.codes.push(incrementLabelIRCode);
                    genStatement(statement.increment);

                    methodIR.codes.push({
                        type: IRCodeType.label,
                        label: conditionLabel,
                    });
                    const nextLabelIRCode: LabelIRCode = {
                        type: IRCodeType.label,
                        label: nextLabel,
                    };
                    genExpersionNodeForJump(
                        statement.condition,
                        bodyLabelIRCode,
                        nextLabelIRCode
                    );
                    methodIR.codes.push(nextLabelIRCode);

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

                    methodIR.codes.push({
                        type: IRCodeType.label,
                        label: beginLabel,
                    });

                    const bodyLabelIRCode: LabelIRCode = {
                        type: IRCodeType.label,
                        label: bodyLabel,
                    };
                    const nextLabelIRCode: LabelIRCode = {
                        type: IRCodeType.label,
                        label: nextLabel,
                    };

                    genExpersionNodeForJump(
                        statement.condition,
                        bodyLabelIRCode,
                        nextLabelIRCode
                    );

                    methodIR.codes.push(bodyLabelIRCode);

                    genBlockNode(statement.body);
                    methodIR.codes.push({
                        type: IRCodeType.jump,
                        targetLabel: beginLabel,
                    });
                    methodIR.codes.push(nextLabelIRCode);

                    breakLabelStack.pop();
                    continueLabelStack.pop();

                    break;
                }
                case SyntaxKind.BreakStatement:
                {
                    const breakLabel = breakLabelStack[breakLabelStack.length - 1];
                    methodIR.codes.push({
                        type: IRCodeType.jump,
                        targetLabel: breakLabel,
                    });
                    break;
                }
                case SyntaxKind.ContinueStatement:
                {
                    const continueLabel = continueLabelStack[continueLabelStack.length - 1];
                    methodIR.codes.push({
                        type: IRCodeType.jump,
                        targetLabel: continueLabel,
                    });
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
                            const assignIRCodeLeft = genLocationNodeForLValue(left);
                            methodIR.codes.push({
                                type: IRCodeType.assign,
                                left: assignIRCodeLeft,
                                right: assignIRCodeRight,
                            });
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
                            const stackValueRight = symbolTable.addLocalTmp('int');
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
                            const stackValueIndex = symbolTable.addLocalTmp('int');
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

                            const stackValueRight = symbolTable.addLocalTmp('int');
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

                            const stackValueIndex = symbolTable.addLocalTmp('int');
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

                            const stackValueIndex = symbolTable.addLocalTmp('int');
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

                            const stackValueIndex = symbolTable.addLocalTmp('int');
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
            }
        }

        function genArgumentList(argumentNodes: ArgumentNode[]) {
            const argumentBuffer: Array<LiteralValue | IdentifierValue | StringValue> = [];
            argumentNodes.forEach(argumentNode => {
                switch (argumentNode.kind) {
                    case SyntaxKind.StringLiteral:
                    {
                        argumentBuffer.push({
                            kind: ValueKind.String,
                            value: argumentNode.value,
                        });
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
                        argumentBuffer.push(rvalue);
                        break;
                    }
                }
            });

            return argumentBuffer;
        }

        function genExpersionNodeForRValue(node: ExpressionNode): IdentifierValue | LiteralValue {
            switch (node.kind) {
                case SyntaxKind.TrueKeyword:
                case SyntaxKind.FalseKeyword:
                {
                    return {
                        kind: ValueKind.Literal,
                        type: 'bool',
                        value: node.value ? 1 : 0,
                    };
                }
                case SyntaxKind.IntLiteral:
                {
                    const radix = node.value.startsWith('0x') ? 16 : 10;
                    return {
                        kind: ValueKind.Literal,
                        type: 'int',
                        value: parseInt(node.value, radix),
                    };
                }
                case SyntaxKind.CharLiteral:
                {
                    return {
                        kind: ValueKind.Literal,
                        type: 'int',
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

                    return {
                        kind: ValueKind.Identifier,
                        symbol,
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

                    switch (operator) {
                        case SyntaxKind.PlusToken:
                        case SyntaxKind.MinusToken:
                        case SyntaxKind.AsteriskToken:
                        case SyntaxKind.SlashToken:
                        case SyntaxKind.PercentToken:
                        {
                            const tmpSymbol = symbolTable.addLocalTmp('int');
                            const result: IdentifierValue = {
                                kind: ValueKind.Identifier,
                                symbol: tmpSymbol,
                            };
                            methodIR.codes.push({
                                type: IRCodeType.binary,
                                operator,
                                left: leftGen,
                                right: rightGen,
                                result,
                            });
                            return result;
                        }
                        case SyntaxKind.GreaterThanToken:
                        case SyntaxKind.LessThanToken:
                        case SyntaxKind.GreaterThanEqualsToken:
                        case SyntaxKind.LessThanEqualsToken:
                        case SyntaxKind.EqualsEqualsToken:
                        case SyntaxKind.ExclamationEqualsToken:
                        {
                            const result: IdentifierValue = {
                                kind: ValueKind.Identifier,
                                symbol: symbolTable.addLocalTmp('bool'),
                            };
                            const trueLabel = globalLabels.getLabel();
                            const falseLabel = globalLabels.getLabel();
                            const nextLabel = globalLabels.getLabel();

                            // condition
                            methodIR.codes.push({
                                type: IRCodeType.conditionalJump,
                                operator,
                                left: leftGen,
                                right: rightGen,
                                targetLabel: trueLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.jump,
                                targetLabel: falseLabel,
                            });

                            // true case
                            methodIR.codes.push({
                                type: IRCodeType.label,
                                label: trueLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.assign,
                                left: result,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 1,
                                },
                            });
                            methodIR.codes.push({
                                type: IRCodeType.jump,
                                targetLabel: nextLabel,
                            });

                            // false case
                            methodIR.codes.push({
                                type: IRCodeType.label,
                                label: falseLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.assign,
                                left: result,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 0,
                                },
                            });

                            // next code
                            methodIR.codes.push({
                                type: IRCodeType.label,
                                label: nextLabel,
                            });
                            return result;
                        }
                        case SyntaxKind.AmpersandAmpersandToken:
                        {
                            const result: IdentifierValue = {
                                kind: ValueKind.Identifier,
                                symbol: symbolTable.addLocalTmp('bool'),
                            };
                            const trueLabel = globalLabels.getLabel();
                            const falseLabel = globalLabels.getLabel();
                            const nextLabel = globalLabels.getLabel();

                            const newTrueLabel = globalLabels.getLabel();
                            const newTrueLabelIRCode: LabelIRCode = {
                                type: IRCodeType.label,
                                label: newTrueLabel,
                            };

                            methodIR.codes.push({
                                type: IRCodeType.conditionalJump,
                                operator: SyntaxKind.EqualsEqualsToken,
                                left: leftGen,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 1,
                                },
                                targetLabel: newTrueLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.jump,
                                targetLabel: falseLabel,
                            });

                            methodIR.codes.push(newTrueLabelIRCode);

                            methodIR.codes.push({
                                type: IRCodeType.conditionalJump,
                                operator: SyntaxKind.EqualsEqualsToken,
                                left: rightGen,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 1,
                                },
                                targetLabel: trueLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.jump,
                                targetLabel: falseLabel,
                            });

                            methodIR.codes.push({
                                type: IRCodeType.label,
                                label: trueLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.assign,
                                left: result,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 1,
                                },
                            });
                            methodIR.codes.push({
                                type: IRCodeType.jump,
                                targetLabel: nextLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.label,
                                label: falseLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.assign,
                                left: result,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 0,
                                },
                            });
                            methodIR.codes.push({
                                type: IRCodeType.label,
                                label: nextLabel,
                            });
                            return result;
                        }
                        case SyntaxKind.BarBarToken:
                        {
                            const result: IdentifierValue = {
                                kind: ValueKind.Identifier,
                                symbol: symbolTable.addLocalTmp('bool'),
                            };

                            const trueLabel = globalLabels.getLabel();
                            const falseLabel = globalLabels.getLabel();
                            const nextLabel = globalLabels.getLabel();

                            const newFalseLabel = globalLabels.getLabel();
                            const newFalseLabelIRCode: LabelIRCode = {
                                type: IRCodeType.label,
                                label: newFalseLabel,
                            };

                            methodIR.codes.push({
                                type: IRCodeType.conditionalJump,
                                operator: SyntaxKind.EqualsEqualsToken,
                                left: leftGen,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 1,
                                },
                                targetLabel: trueLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.jump,
                                targetLabel: newFalseLabel,
                            });

                            methodIR.codes.push(newFalseLabelIRCode);

                            methodIR.codes.push({
                                type: IRCodeType.conditionalJump,
                                operator: SyntaxKind.EqualsEqualsToken,
                                left: rightGen,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 1,
                                },
                                targetLabel: trueLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.jump,
                                targetLabel: falseLabel,
                            });

                            methodIR.codes.push({
                                type: IRCodeType.label,
                                label: trueLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.assign,
                                left: result,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 1,
                                },
                            });
                            methodIR.codes.push({
                                type: IRCodeType.jump,
                                targetLabel: nextLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.label,
                                label: falseLabel,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.assign,
                                left: result,
                                right: {
                                    kind: ValueKind.Literal,
                                    type: 'bool',
                                    value: 0,
                                },
                            });
                            methodIR.codes.push({
                                type: IRCodeType.label,
                                label: nextLabel,
                            });
                            return result;
                        }
                    }
                    break;
                }
                case SyntaxKind.UnaryExpression:
                {
                    const {operator, operand} = node;

                    const operandGen = genExpersionNodeForRValue(operand);

                    const result: IdentifierValue = {
                        kind: ValueKind.Identifier,
                        symbol: symbolTable.addLocalTmp('bool'),
                    };
                    methodIR.codes.push({
                        type: IRCodeType.unary,
                        operator,
                        operand: operandGen,
                        result,
                    });
                    return result;
                }
                case SyntaxKind.CallExpression:
                {
                    const {callee, nodeType} = node;

                    if (callee.name === 'len') {
                        const argumentNode = node.arguments[0];
                        if (!argumentNode || argumentNode.kind !== SyntaxKind.Identifier) {
                            throw new Error('unexpected');
                        }
                        const symbol = symbolTable.find(argumentNode.name)!;
                        if (symbol.kind !== 'global' && symbol.kind !== 'local') {
                            throw new Error('unexpected');
                        }
                        const length = symbol.length;
                        const result: LiteralValue = {
                            kind: ValueKind.Literal,
                            type: 'int',
                            value: length,
                        };
                        return result;
                    }

                    const argumentList = genArgumentList(node.arguments);
                    methodIR.codes.push({
                        type: IRCodeType.call,
                        name: callee.name,
                        args: argumentList,
                        needReturnValue: true,
                    });

                    const type = nodeType === Type.Bool ? 'bool' : 'int';
                    // 由于存在 call(1) + call(2) 这样的情况，
                    // 因此构造临时的 identifier，在内存中保存返回值
                    // 防止连续调用的情况下 %rax 相互覆盖
                    const result: IdentifierValue = {
                        kind: ValueKind.Identifier,
                        symbol: symbolTable.addLocalTmp(type),
                    };
                    methodIR.codes.push({
                        type: IRCodeType.assign,
                        left: result,
                        right: {
                            kind: ValueKind.Identifier,
                            symbol: {
                                kind: 'local',
                                name: '@returnValue',
                                type,
                                isArray: false,
                                length: -1,
                            },
                        },
                    });
                    return result;
                }
                case SyntaxKind.ArrayLocation:
                {
                    const {name, index} = node;
                    const indexRValue = genExpersionNodeForRValue(index);
                    const symbol = symbolTable.find(name.name)!;
                    programIR.enableArrayBoundCheck = true;
                    const location: ArrayLocationValue = {
                        kind: ValueKind.ArrayLocation,
                        symbol,
                        index: indexRValue,
                        enableArrayBoundCheck: true,
                    };
                    const result: IdentifierValue = {
                        kind: ValueKind.Identifier,
                        symbol: symbolTable.addLocalTmp(symbol.type),
                    };
                    methodIR.codes.push({
                        type: IRCodeType.arrayLocation,
                        location,
                        result,
                    });
                    return result;
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
                            methodIR.codes.push({
                                type: IRCodeType.conditionalJump,
                                operator: node.operator,
                                left,
                                right,
                                targetLabel: trueLabel.label,
                            });
                            methodIR.codes.push({
                                type: IRCodeType.jump,
                                targetLabel: falseLabel.label,
                            });
                            break;
                        }
                        case SyntaxKind.BarBarToken:
                        {
                            const newFalseLabel = globalLabels.getLabel();
                            const newFalseLabelIRCode: LabelIRCode = {
                                type: IRCodeType.label,
                                label: newFalseLabel,
                            };
                            genExpersionNodeForJump(node.left, trueLabel, newFalseLabelIRCode);
                            methodIR.codes.push(newFalseLabelIRCode);
                            genExpersionNodeForJump(node.right, trueLabel, falseLabel);
                            break;
                        }
                        case SyntaxKind.AmpersandAmpersandToken:
                        {
                            const newTrueLabel = globalLabels.getLabel();
                            const newTrueLabelIRCode: LabelIRCode = {
                                type: IRCodeType.label,
                                label: newTrueLabel,
                            };
                            genExpersionNodeForJump(node.left, newTrueLabelIRCode, falseLabel);
                            methodIR.codes.push(newTrueLabelIRCode);
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
                    const right: LiteralValue = {
                        kind: ValueKind.Literal,
                        type: 'bool',
                        value: 0,
                    };
                    methodIR.codes.push({
                        type: IRCodeType.conditionalJump,
                        operator: SyntaxKind.ExclamationEqualsToken,
                        left,
                        right,
                        targetLabel: trueLabel.label,
                    });
                    methodIR.codes.push({
                        type: IRCodeType.jump,
                        targetLabel: falseLabel.label,
                    });
                    break;
                }
                default:
                    throw new Error('todo');
            }
        }

        function genLocationNodeForLValue(node: LocationNode): IdentifierValue | ArrayLocationValue {
            if (node.kind === SyntaxKind.Identifier) {
                const symbol = symbolTable.find(node.name)!;
                return {
                    kind: ValueKind.Identifier,
                    symbol,
                };
            }

            const {name, index} = node;
            const indexRValue = genExpersionNodeForRValue(index);
            const symbol = symbolTable.find(name.name)!;
            programIR.enableArrayBoundCheck = true;
            return {
                kind: ValueKind.ArrayLocation,
                symbol,
                index: indexRValue,
                enableArrayBoundCheck: true,
            };
        }
    }
}
