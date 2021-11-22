/**
 * @file decaf parser
 * @descript 采用递归下降的方式解析语法
 * 没有采用移进归约的方法进行解析，因为状态实在太多，处理不了
 * 也就 md 这样的语法，能够手写移进归约：https://github.com/harttle/md-padding/blob/master/src/parser/parse.ts
 */

import {Scanner} from '../scanner';
import {
    SyntaxKind,
    ProgramNode,
    ImportDeclarationNode,
    FieldDeclarationNode,
    DeclarationNode,
    MethodDeclarationNode,
    ParameterNode,
    BlockNode,
    StatementNode,
    IfStatementNode,
    ForStatementNode,
    WhileStatementNode,
    ReturnStatementNode,
    AssignmentStatementNode,
    CallStatementNode,
    ExpressionNode,
    CallExpressionNode,
    ForInitializerNode,
    ForIncrementNode,
    LocationNode,
    ArgumentNode,
    LiteralNode,
    IntLiteralNode,
    CharLiteralNode,
    IdentifierNode,
} from '../types/grammar';

export class Parser {
    private readonly scanner: Scanner;
    private currentToken: SyntaxKind;

    constructor(code: string) {
        this.scanner = new Scanner(code);
        this.currentToken = this.scanner.scan();
    }

    /**
     * 解析 decaf 语法，得到 ast
     * 出错时，返回 null，懒得做错误具体展示了
     *
     * @returns
     */
    parse(): ProgramNode | null {
        try {
            return this.parseProgram();
        }
        catch (e) {
            return null;
        }
    }

    /**
     * 程序入口解析函数
     * 一个 decaf 程序由三部分构成，分别是 import 声明，全局变量声明，方法声明
     *
     * @returns
     */
    private parseProgram(): ProgramNode {
        const pos = this.scanner.getTokenPos();

        // 解析 import 声明
        const importDeclarations = this.parseImportDeclarations();

        // 对于 field 和 method，由于 <int|bool> <identifier> 是这两类声明的公共前缀
        // 并且这个前缀包含两个 token，不能通过一个前看 token 确认采用哪个产生式
        // 因此，放到一个函数里面去解析
        const {
            fieldDeclarations,
            methodDeclarations,
        } = this.parseFieldOrMethodDeclarations();

        return {
            kind: SyntaxKind.Program,
            importDeclarations,
            fieldDeclarations,
            methodDeclarations,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析 import 声明列表
     *
     * @returns
     */
    private parseImportDeclarations(): ImportDeclarationNode[] {
        const importDeclarations: ImportDeclarationNode[] = [];
        while (this.getCurrentToken() === SyntaxKind.ImportKeyword) {
            importDeclarations.push(this.parseImportDeclaration());
        }
        return importDeclarations;
    }

    /**
     * 解析 import 声明
     *
     * @returns
     */
    private parseImportDeclaration(): ImportDeclarationNode {
        // 外边已经保证了第一个 token 是 import，所以就不重复判断了
        const pos = this.scanner.getTokenPos();
        this.nextToken();
        const importName = this.parseIdentifier();

        this.expect(SyntaxKind.SemicolonToken);
        return {
            kind: SyntaxKind.ImportDeclaration,
            importName,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析 field 和 method 声明
     *
     * @returns
     */
    private parseFieldOrMethodDeclarations() {
        const fieldDeclarations: FieldDeclarationNode[] = [];
        const methodDeclarations: MethodDeclarationNode[] = [];

        // 如果是 void keyword，其实已经能说明是 method 声明了
        // 但是为了方便起见，都放在一起处理
        while (
            this.getCurrentToken() === SyntaxKind.VoidKeyword
            || this.getCurrentToken() === SyntaxKind.IntKeyword
            || this.getCurrentToken() === SyntaxKind.BoolKeyword
        ) {
            const pos = this.scanner.getTokenPos();
            const type = this.getCurrentToken() as
                SyntaxKind.VoidKeyword | SyntaxKind.IntKeyword | SyntaxKind.BoolKeyword;

            // 读取 type 后的 identifier token
            this.nextToken();
            // 这里注意，所有的 parse xxx 函数运行后，都会把 currentToken 指向下一个 token
            const identifier = this.parseIdentifier();

            // 如果下一个 token 是 ( 则是 method 声明
            if (this.getCurrentToken() === SyntaxKind.OpenParenToken) {
                methodDeclarations.push(this.parseMethodDeclaration(type, identifier, pos));
            }
            // 否则是 field 声明，这里的 if 只作为 type guard
            else if (type !== SyntaxKind.VoidKeyword) {
                fieldDeclarations.push(this.parseFieldDeclaration(type, identifier, pos));
            }
        }

        return {fieldDeclarations, methodDeclarations};
    }

    /**
     * 解析一个 field 声明，这个函数比较特殊，需要把前缀的两个 token 传入进来
     *
     * @param type
     * @param identifier
     * @param pos type token 的 tokenPos
     * @returns
     */
    private parseFieldDeclaration(
        type: SyntaxKind.IntKeyword | SyntaxKind.BoolKeyword,
        identifier: IdentifierNode,
        pos: number
    ): FieldDeclarationNode {
        const declarations: DeclarationNode[] = [];

        // 此时的 currentToken 是 identifier 的后一个 token
        // 因为 parseIdentifier 已经把 currentToken 指向下一个 token
        const declaration = this.readDeclarationNode(identifier);
        declarations.push(declaration);

        // 如果包含了多个相同类型的声明
        while (this.getCurrentToken() === SyntaxKind.CommaToken) {
            this.nextToken();
            const identifier = this.parseIdentifier();

            const declaration = this.readDeclarationNode(identifier);
            declarations.push(declaration);
        }

        this.expect(SyntaxKind.SemicolonToken);
        return {
            kind: SyntaxKind.FieldDeclaration,
            type,
            declarations,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 封装变量声明和数组声明的解析差异
     *
     * @param identifier
     * @returns
     */
    private readDeclarationNode(identifier: IdentifierNode): DeclarationNode {
        const isArrayDeclaration = this.getCurrentToken() === SyntaxKind.OpenBracketToken;
        if (!isArrayDeclaration) {
            return identifier;
        }
        this.nextToken();
        const size = this.parseIntLiteral();

        this.expect(SyntaxKind.CloseBracketToken);
        return {
            kind: SyntaxKind.ArrayDeclaration,
            name: identifier,
            size,
            pos: identifier.pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个 method 声明
     *
     * @param returnType
     * @param name
     * @param pos
     * @returns
     */
    private parseMethodDeclaration(
        returnType: SyntaxKind.IntKeyword | SyntaxKind.BoolKeyword | SyntaxKind.VoidKeyword,
        name: IdentifierNode,
        pos: number
    ): MethodDeclarationNode {
        this.expect(SyntaxKind.OpenParenToken);
        const parameters = this.parseParameters();
        this.expect(SyntaxKind.CloseParenToken);

        const body = this.parseBlock();
        return {
            kind: SyntaxKind.MethodDeclaration,
            returnType,
            name,
            parameters,
            body,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个参数列表
     *
     * @returns
     */
    private parseParameters(): ParameterNode[] {
        const parameters: ParameterNode[] = [];

        // 如果当前 token 是 identifier，说明是一个参数
        while (
            this.getCurrentToken() === SyntaxKind.IntKeyword
            || this.getCurrentToken() === SyntaxKind.BoolKeyword
        ) {
            const pos = this.scanner.getTokenPos();
            const type = this.getCurrentToken() as SyntaxKind.IntKeyword | SyntaxKind.BoolKeyword;
            this.nextToken();

            const identifier = this.parseIdentifier();
            parameters.push({
                kind: SyntaxKind.Parameter,
                type,
                name: identifier,
                pos,
                end: identifier.end,
            });

            // 如果当前 token 是 ,，说明还有参数
            if (this.getCurrentToken() === SyntaxKind.CommaToken) {
                this.nextToken();
            }
        }

        return parameters;
    }

    /**
     * 解析一个 block
     *
     * @returns
     */
    private parseBlock(): BlockNode {
        const pos = this.scanner.getTokenPos();
        this.expect(SyntaxKind.OpenBraceToken);

        const fields: FieldDeclarationNode[] = [];

        while (
            this.getCurrentToken() === SyntaxKind.IntKeyword
            || this.getCurrentToken() === SyntaxKind.BoolKeyword
        ) {
            const pos = this.scanner.getTokenPos();
            const type = this.getCurrentToken() as SyntaxKind.IntKeyword | SyntaxKind.BoolKeyword;
            this.nextToken();

            const identifier = this.parseIdentifier();
            fields.push(this.parseFieldDeclaration(type, identifier, pos));
        }

        const statements: StatementNode[] = [];
        while (this.getCurrentToken() !== SyntaxKind.CloseBraceToken) {
            const statement = this.parseStatement();
            statements.push(statement);
        }

        this.expect(SyntaxKind.CloseBraceToken);
        return {
            kind: SyntaxKind.Block,
            fields,
            statements,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个 statement
     *
     * @returns
     */
    private parseStatement(): StatementNode {
        switch (this.getCurrentToken()) {
            case SyntaxKind.IfKeyword:
                return this.parseIfStatement();
            case SyntaxKind.ForKeyword:
                return this.parseForStatement();
            case SyntaxKind.WhileKeyword:
                return this.parseWhileStatement();
            case SyntaxKind.ReturnKeyword:
                return this.parseReturnStatement();
            case SyntaxKind.BreakKeyword:
                return {
                    kind: SyntaxKind.BreakStatement,
                    pos: this.scanner.getTokenPos(),
                    end: this.scanner.getTextPos() - 1,
                };
            case SyntaxKind.ContinueKeyword:
                return {
                    kind: SyntaxKind.ContinueStatement,
                    pos: this.scanner.getTokenPos(),
                    end: this.scanner.getTextPos() - 1,
                };
            default:
                return this.parseAssignmentOrCallStatement();
        }
    }

    /**
     * 解析一个 if 语句
     *
     * @returns
     */
    private parseIfStatement(): IfStatementNode {
        const pos = this.scanner.getTokenPos();
        this.expect(SyntaxKind.IfKeyword);
        this.expect(SyntaxKind.OpenParenToken);
        const condition = this.parseExpression();
        this.expect(SyntaxKind.CloseParenToken);

        const thenBlock = this.parseBlock();

        let elseBlock: BlockNode | undefined = undefined;
        if (this.getCurrentToken() === SyntaxKind.ElseKeyword) {
            this.nextToken();
            elseBlock = this.parseBlock();
        }

        return {
            kind: SyntaxKind.IfStatement,
            condition,
            thenBlock,
            elseBlock,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个 for 语句
     *
     * @returns
     */
    private parseForStatement(): ForStatementNode {
        const pos = this.scanner.getTokenPos();
        this.expect(SyntaxKind.ForKeyword);
        this.expect(SyntaxKind.OpenParenToken);

        const initializer = this.parseForInitializer();
        this.expect(SyntaxKind.SemicolonToken);

        const condition = this.parseExpression();
        this.expect(SyntaxKind.SemicolonToken);

        const increment = this.parseForIncrement();
        this.expect(SyntaxKind.CloseParenToken);

        const body = this.parseBlock();

        return {
            kind: SyntaxKind.ForStatement,
            initializer,
            condition,
            increment,
            body,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个 for 循环的初始化部分
     *
     * @returns
     */
    private parseForInitializer(): ForInitializerNode {
        const declaration = this.parseIdentifier();
        this.expect(SyntaxKind.EqualsToken);
        const expression = this.parseExpression();
        return {
            kind: SyntaxKind.ForInitializer,
            declaration,
            expression,
            pos: declaration.pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个 for 循环的增量部分
     *
     * @returns
     */
    private parseForIncrement(): ForIncrementNode {
        const location = this.parseLocationNode();
        switch (this.getCurrentToken()) {
            case SyntaxKind.PlusPlusToken:
            case SyntaxKind.MinusMinusToken:
            {
                const operator = this.getCurrentToken() as SyntaxKind.PlusPlusToken | SyntaxKind.MinusMinusToken;
                this.nextToken();
                return {
                    kind: SyntaxKind.ForIncrement,
                    declaration: location,
                    operator,
                    pos: location.pos,
                    end: this.scanner.getTextPos() - 1,
                };
            }
            // 相当于
            // case SyntaxKind.PlusEqualsToken:
            // case SyntaxKind.MinusEqualsToken:
            default:
            {
                const operator = this.getCurrentToken() as SyntaxKind.PlusEqualsToken | SyntaxKind.MinusEqualsToken;
                this.nextToken();
                const expression = this.parseExpression();

                return {
                    kind: SyntaxKind.ForIncrement,
                    declaration: location,
                    operator,
                    expression,
                    pos: location.pos,
                    end: this.scanner.getTextPos() - 1,
                };
            }
        }
    }

    /**
     * 解析一个 while 语句
     *
     * @returns
     */
    private parseWhileStatement(): WhileStatementNode {
        const pos = this.scanner.getTokenPos();
        this.expect(SyntaxKind.WhileKeyword);
        this.expect(SyntaxKind.OpenParenToken);
        const condition = this.parseExpression();
        this.expect(SyntaxKind.CloseParenToken);
        const body = this.parseBlock();
        return {
            kind: SyntaxKind.WhileStatement,
            condition,
            body,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个 return 语句
     *
     * @returns
     */
    private parseReturnStatement(): ReturnStatementNode {
        const pos = this.scanner.getTokenPos();
        this.expect(SyntaxKind.ReturnKeyword);
        const expression = this.getCurrentToken() === SyntaxKind.SemicolonToken
            ? undefined
            : this.parseExpression();
        this.expect(SyntaxKind.SemicolonToken);
        return {
            kind: SyntaxKind.ReturnStatement,
            expression,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 由于赋值语句和调用语句都是 identifier 开头，需要向前看一下
     *
     * @returns
     */
    private parseAssignmentOrCallStatement(): AssignmentStatementNode | CallStatementNode {
        const identifier = this.parseIdentifier();
        if (this.getCurrentToken() === SyntaxKind.OpenParenToken) {
            return this.parseCallStatement(identifier);
        }
        else {
            return this.parseAssignmentStatement(identifier);
        }
    }

    /**
     * 解析一个函数调用语句
     *
     * @param identifier
     * @returns
     */
    private parseCallStatement(identifier: IdentifierNode): CallStatementNode {
        const expression = this.parseCallExpression(identifier);
        return {
            kind: SyntaxKind.CallStatement,
            expression,
            pos: identifier.pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个赋值语句
     *
     * @param identifier
     * @returns
     */
    private parseAssignmentStatement(identifier: IdentifierNode): AssignmentStatementNode {
        const left = this.parseLocationNode(identifier);
        switch (this.getCurrentToken()) {
            case SyntaxKind.PlusEqualsToken:
            case SyntaxKind.MinusEqualsToken:
            case SyntaxKind.EqualsToken:
            {
                const operator = this.getCurrentToken() as
                    SyntaxKind.PlusEqualsToken
                    | SyntaxKind.MinusEqualsToken
                    | SyntaxKind.EqualsToken;
                const right = this.parseExpression();
                this.expect(SyntaxKind.SemicolonToken);
                return {
                    kind: SyntaxKind.AssignmentStatement,
                    left,
                    operator,
                    right,
                    pos: left.pos,
                    end: this.scanner.getTextPos() - 1,
                };
            }
            // case SyntaxKind.PlusPlusToken:
            // case SyntaxKind.MinusMinusToken:
            default:
            {
                const operator = this.getCurrentToken() as SyntaxKind.PlusPlusToken | SyntaxKind.MinusMinusToken;
                this.expect(SyntaxKind.SemicolonToken);
                return {
                    kind: SyntaxKind.AssignmentStatement,
                    left,
                    operator,
                    pos: left.pos,
                    end: this.scanner.getTextPos() - 1,
                };
            }
        }
    }

    /**
     * 解析一个变量获取节点
     *
     * @returns
     */
    private parseLocationNode(preParsedIdentifier?: IdentifierNode): LocationNode {
        const identifier = preParsedIdentifier ? preParsedIdentifier : this.parseIdentifier();
        if (this.getCurrentToken() !== SyntaxKind.OpenBracketToken) {
            return identifier;
        }
        this.nextToken();
        const index = this.parseExpression();
        this.expect(SyntaxKind.CloseBracketToken);
        return {
            kind: SyntaxKind.ArrayLocation,
            name: identifier,
            index,
            pos: identifier.pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    // @ts-expect-error
    private parseExpression(): ExpressionNode {

    }

    /**
     * 解析一个函数调用表达式
     *
     * @param callee
     * @returns
     */
    private parseCallExpression(callee: IdentifierNode): CallExpressionNode {
        this.expect(SyntaxKind.OpenParenToken);
        const parsedArguments = this.parseArguments();
        this.expect(SyntaxKind.CloseParenToken);
        return {
            kind: SyntaxKind.CallExpression,
            callee,
            arguments: parsedArguments,
            pos: callee.pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析函数调用参数列表
     *
     * @returns
     */
    private parseArguments(): ArgumentNode[] {
        const args: ArgumentNode[] = [];
        while (this.getCurrentToken() !== SyntaxKind.CloseParenToken) {
            args.push(this.parseArgument());
            if (this.getCurrentToken() !== SyntaxKind.CloseParenToken) {
                this.expect(SyntaxKind.CommaToken);
            }
        }
        return args;
    }

    /**
     * 解析一个函数调用参数
     *
     * @returns
     */
    private parseArgument(): ArgumentNode {
        if (this.getCurrentToken() === SyntaxKind.StringLiteral) {
            const pos = this.scanner.getTokenPos();
            return {
                kind: SyntaxKind.StringLiteral,
                value: this.scanner.getTokenValue()!,
                pos,
                end: this.scanner.getTextPos() - 1,
            };
        }
        const expression = this.parseExpression();
        return expression;
    }

    /**
     * 解析一个字面量
     *
     * @returns
     */
    private parseLiteral(): LiteralNode {
        switch (this.getCurrentToken()) {
            case SyntaxKind.CharLiteral:
                return this.parseCharLiteral();
            case SyntaxKind.IntLiteral:
                return this.parseIntLiteral();
            case SyntaxKind.TrueKeyword:
                return {
                    kind: SyntaxKind.TrueKeyword,
                    value: true,
                    pos: this.scanner.getTokenPos(),
                    end: this.scanner.getTextPos() - 1,
                };
            case SyntaxKind.FalseKeyword:
            default:
                return {
                    kind: SyntaxKind.FalseKeyword,
                    value: false,
                    pos: this.scanner.getTokenPos(),
                    end: this.scanner.getTextPos() - 1,
                };
        }
    }

    /**
     * 读取一个数字字面量，不区分十进制和十六进制
     *
     * @returns
     */
    private parseIntLiteral(): IntLiteralNode {
        const pos = this.scanner.getTokenPos();
        // 因为需要拿到 value，所以不默认 goAhead，而是拿到 value 后手动 nextToken
        this.expect(SyntaxKind.IntLiteral, false);
        const value = this.scanner.getTokenValue()!;
        this.nextToken();

        return {
            kind: SyntaxKind.IntLiteral,
            value,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个字符字面量
     *
     * @returns
     */
    private parseCharLiteral(): CharLiteralNode {
        const pos = this.scanner.getTokenPos();
        this.expect(SyntaxKind.CharLiteral);
        const value = this.scanner.getTokenValue()!;
        this.nextToken();

        return {
            kind: SyntaxKind.CharLiteral,
            value,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个 identifier
     *
     * @returns
     */
    private parseIdentifier(): IdentifierNode {
        const pos = this.scanner.getTokenPos();
        this.expect(SyntaxKind.Identifier, false);
        const name = this.scanner.getTokenValue()!;
        this.nextToken();

        return {
            kind: SyntaxKind.Identifier,
            name,
            pos,
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 获取当前 token
     *
     * @returns
     */
    private getCurrentToken(): SyntaxKind {
        return this.currentToken;
    }

    /**
     * 前往下一个 token
     *
     * @returns
     */
    private nextToken(): SyntaxKind {
        this.currentToken = this.scanner.scan();
        return this.currentToken;
    }

    /**
     * 如果当前 token 是 expectedToken，则跳过，否则抛出错误
     *
     * @param kind
     * @param goAhead 是否前进到下一个 token，默认为 true
     */
    private expect(kind: SyntaxKind, goAhead: boolean = true): void {
        if (this.currentToken === kind) {
            if (goAhead) {
                this.nextToken();
            }
        }
        else {
            throw new Error(`Expected ${kind}, got ${this.currentToken}`);
        }
    }
}
