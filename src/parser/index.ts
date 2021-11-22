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
    IntLiteralNode,
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

    private parseMethodDeclaration(
        returnType: SyntaxKind.IntKeyword | SyntaxKind.BoolKeyword | SyntaxKind.VoidKeyword,
        name: IdentifierNode,
        pos: number
    ): MethodDeclarationNode {
        this.expect(SyntaxKind.OpenParenToken);
        // @ts-expect-error
        const parameters = this.parseParameters();
        this.expect(SyntaxKind.CloseParenToken);
        // @ts-expect-error
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
     * 读取一个数字字面量，不区分十进制和十六进制
     *
     * @returns
     */
    private parseIntLiteral(): IntLiteralNode {
        // 因为需要拿到 value，所以不默认 goAhead，而是拿到 value 后手动 nextToken
        this.expect(SyntaxKind.IntLiteral, false);
        const value = this.scanner.getTokenValue()!;
        this.nextToken();

        return {
            kind: SyntaxKind.IntLiteral,
            value,
            pos: this.scanner.getTokenPos(),
            end: this.scanner.getTextPos() - 1,
        };
    }

    /**
     * 解析一个 identifier
     *
     * @returns
     */
    private parseIdentifier(): IdentifierNode {
        this.expect(SyntaxKind.Identifier, false);
        const name = this.scanner.getTokenValue()!;
        this.nextToken();

        return {
            kind: SyntaxKind.Identifier,
            name,
            pos: this.scanner.getTokenPos(),
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
