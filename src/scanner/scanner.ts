/**
 * @file decaf scanner
 */

import {SyntaxKind, CharacterCodes} from '../types/grammar';
import {codePointAt} from '../core/codePointAt';
import {formatUnexpectedCharError, formatExpectingButFoundError} from './diagnostics';
import {isLineBreak} from './utils';

/**
 * Scanner for the decaf language.
 *
 * decaf 语言的字符集仅包括 ASCII 字符，不包括中文字符。
 * 因此，只需要考虑 ASCII 字符的语法即可。
 */
export class Scanner {

    /**
     * 当前扫描到的字符位置
     */
    private pos?: number;

    /**
     * 当前扫描文本的长度
     */
    private end?: number;

    /**
     * 待扫描的文本
     */
    private text?: string;

    /**
     * 当前读取到的 token 的类型
     */
    private token?: SyntaxKind;

    /**
     * 当前读取到的 token 值，对于非标识符、字面量类型的 token，值为 undefined
     */
    private tokenValue: string | undefined;

    /**
     *
     */
    private tokenPos?: number;

    /**
     * 词法分析错误回调函数
     * 通过 setOnError 方法进行设置
     *
     * @param message 错误信息
     * @param pos 当前扫描到的字符位置
     */
    private onError?: (message: string, pos: number) => void;

    /**
     * 返回读取到的 token 的类型
     *
     * @returns 当前读取到的 token 的类型
     */
    getToken(): SyntaxKind {
        return this.token!;
    }

    /**
     * 返回 token 的值
     *
     * @returns
     */
    getTokenValue(): string | undefined {
        return this.tokenValue;
    }

    /**
     * 读取当前 token 的位置
     *
     * @returns 当前 token 的位置
     */
    getTokenPos(): number {
        return this.tokenPos!;
    }

    /**
     * 设置 scanner 要扫描的文本串，同时重置 scanner 的状态
     * 对于新创建的 scanner，需要调用该方法进行初始化
     *
     * @param text 待扫描的文本
     */
    setText(text: string) {
        this.text = text;
        this.pos = 0;
        this.end = text.length;
        this.token = SyntaxKind.Unknown;
        this.tokenValue = undefined;
        this.tokenPos = 0;
    }

    /**
     * 获取 scanner 中的待扫描文本
     *
     * @returns 待扫描文本
     */
    getText(): string {
        return this.text!;
    }

    /**
     * 设置词法分析错误回调函数
     *
     * @param onError 回调函数
     */
    setOnError(onError: (message: string, pos: number) => void) {
        this.onError = onError;
    }

    /**
     * 读取一个 token，返回读取到的 token 的类型
     *
     * @returns 当前读取到的 token 的类型
     */
    scan(): SyntaxKind {

        if (this.pos === undefined || this.end === undefined || this.text === undefined) {
            throw new Error('scanner is not initialized');
        }

        // 重置 token 的值
        this.tokenValue = undefined;

        while (true) {

            this.tokenPos = this.pos;

            // 判断是否已经到达文本末尾
            if (this.pos >= this.end) {
                this.token = SyntaxKind.EndOfFileToken;
                return this.token;
            }

            // 读取 charCode
            const ch = codePointAt(this.text, this.pos);

            switch (ch) {
                // 换行
                case CharacterCodes.lineFeed:
                case CharacterCodes.carriageReturn:
                    this.pos++;
                    continue;

                // 空格
                case CharacterCodes.tab:
                case CharacterCodes.verticalTab:
                case CharacterCodes.formFeed:
                case CharacterCodes.space:
                    this.pos++;
                    continue;

                // 注释或者除号
                case CharacterCodes.slash:
                    // 如果是 // 注释
                    if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.slash) {
                        this.pos += 2;

                        // 跳过行
                        while (this.pos < this.end) {
                            if (isLineBreak(this.text.charCodeAt(this.pos))) {
                                break;
                            }
                            this.pos++;
                        }
                        continue;
                    }
                    // 否则，是除号
                    return this.scanSlashToken();

                // 单引号
                case CharacterCodes.singleQuote:
                    return this.scanCharLiteral();

                // 双引号
                case CharacterCodes.doubleQuote:
                    return this.scanStringLiteral();

                // ! 或 !=
                case CharacterCodes.exclamation:
                    return this.scanExclamationToken();

                // %
                case CharacterCodes.percent:
                    return this.scanPercentToken();

                // &&
                case CharacterCodes.ampersand:
                    return this.scanAmpersandToken();

                // ||
                case CharacterCodes.bar:
                    return this.scanBarToken();

                // (
                case CharacterCodes.openParen:
                    return this.scanOpenParenToken();

                // )
                case CharacterCodes.closeParen:
                    return this.scanCloseParenToken();

                // *
                case CharacterCodes.asterisk:
                    return this.scanAsteriskToken();

                // + 或 ++ 或 +=
                case CharacterCodes.plus:
                    return this.scanPlusToken();

                // - 或 -- 或 -=
                case CharacterCodes.minus:
                    return this.scanMinusToken();

                // ,
                case CharacterCodes.comma:
                    return this.scanCommaToken();

                // > 或 >=
                case CharacterCodes.greaterThan:
                    return this.scanGreaterThanToken();

                // < 或 <=
                case CharacterCodes.lessThan:
                    return this.scanLessThanToken();

                // = 或 ==
                case CharacterCodes.equals:
                    return this.scanEqualsToken();

                // {
                case CharacterCodes.openBrace:
                    return this.scanOpenBraceToken();

                // }
                case CharacterCodes.closeBrace:
                    return this.scanCloseBraceToken();

                // [
                case CharacterCodes.openBracket:
                    return this.scanOpenBracketToken();

                // ]
                case CharacterCodes.closeBracket:
                    return this.scanCloseBracketToken();

                default:
                    this.pos++;

            }

        }
    }

    /**
     * 读取一个 / 运算符，返回读取到的 token 的类型
     */
    private scanSlashToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        this.pos++;
        this.token = SyntaxKind.SlashToken;
        this.tokenValue = '/';
        return this.token;
    }

    /**
     * 读取一个字符字面量，返回读取到的 token 的类型
     *
     * @returns
     */
    private scanCharLiteral(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        const currentCharCode = codePointAt(this.text, this.pos + 1)!;
        // 如果是转义字符
        if (currentCharCode === CharacterCodes.backslash) {
            const ch = this.text.charCodeAt(this.pos + 2);
            // 判断是否为合法的转义字符
            if (
                ch === CharacterCodes.t
                || ch === CharacterCodes.n
                || ch === CharacterCodes.singleQuote
                || ch === CharacterCodes.doubleQuote
                || ch === CharacterCodes.backslash
            ) {
                // 如果是合法的转义字符
                const endChar = this.text.charCodeAt(this.pos + 3);
                // 判断是否以单引号结尾
                if (endChar === CharacterCodes.singleQuote) {
                    this.pos += 4;
                    this.tokenValue = this.text.slice(this.pos - 4, this.pos);
                    this.token = SyntaxKind.CharLiteral;
                    return this.token;
                }
                // 对于非预期的情况，吃掉导致错误的字符，pos 移动到错误字符的下一个字符
                this.pos += 4;
                const errorMessage = formatExpectingButFoundError(endChar, '\'');
                // 由于出错导致吃掉一个字符，真实报错位置应该是 pos - 1，下同
                return this.error(errorMessage, this.pos - 1);
            }
            this.pos += 3;
            const errorMessage = formatUnexpectedCharError(ch);
            return this.error(errorMessage, this.pos - 1);
        }

        if (
            currentCharCode < CharacterCodes.maxAsciiCharacter
            // 空格是最小的可打印字符
            && currentCharCode >= CharacterCodes.space
            && currentCharCode !== CharacterCodes.singleQuote
            && currentCharCode !== CharacterCodes.doubleQuote
        ) {
            const ch = this.text.charCodeAt(this.pos + 2);
            if (ch === CharacterCodes.singleQuote) {
                this.pos += 3;
                this.tokenValue = this.text.slice(this.pos - 3, this.pos);
                this.token = SyntaxKind.CharLiteral;
                return this.token;
            }
            this.pos += 3;
            const errorMessage = formatExpectingButFoundError(ch, '\'');
            return this.error(errorMessage, this.pos - 1);
        }
        this.pos += 2;
        const errorMessage = formatUnexpectedCharError(currentCharCode);
        return this.error(errorMessage, this.pos - 1);
    }

    /**
     * 读取一个字符串字面量，返回读取到的 token 的类型
     */
    // @ts-expect-error
    private scanStringLiteral(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        const currentCharCode = codePointAt(this.text, this.pos + 1)!;


    }

    /**
     * 读取一个 ! 或 != 运算符，返回读取到的 token 的类型
     */
    private scanExclamationToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        if (this.text.charCodeAt(this.pos + 1) === CharacterCodes.equals) {
            this.pos += 2;
            this.token = SyntaxKind.ExclamationEqualsToken;
            this.tokenValue = '!=';
            return this.token;
        }
        this.pos++;
        this.token = SyntaxKind.ExclamationToken;
        this.tokenValue = '!';
        return this.token;
    }

    /**
     * 读取一个 % 运算符，返回读取到的 token 的类型
     */
    private scanPercentToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }
        this.pos++;
        this.token = SyntaxKind.PercentToken;
        this.tokenValue = '%';
        return this.token;
    }

    /**
     * 读取一个 && 运算符，返回读取到的 token 的类型
     */
    private scanAmpersandToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        const ch = this.text.charCodeAt(this.pos + 1);

        if (ch === CharacterCodes.ampersand) {
            this.pos += 2;
            this.token = SyntaxKind.AmpersandAmpersandToken;
            this.tokenValue = '&&';
            return this.token;
        }

        this.pos++;
        const errorMessage = formatExpectingButFoundError(ch, '&');
        return this.error(errorMessage, this.pos);
    }

    /**
     * 读取一个 || 运算符，返回读取到的 token 的类型
     */
    private scanBarToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        const ch = this.text.charCodeAt(this.pos + 1);

        if (ch === CharacterCodes.bar) {
            this.pos += 2;
            this.token = SyntaxKind.BarBarToken;
            this.tokenValue = '||';
            return this.token;
        }

        this.pos++;
        const errorMessage = formatExpectingButFoundError(ch, '|');
        return this.error(errorMessage, this.pos);
    }

    /**
     * 读取一个 ( 运算符，返回读取到的 token 的类型
     */
    private scanOpenParenToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        this.pos++;
        this.token = SyntaxKind.OpenParenToken;
        this.tokenValue = '(';
        return this.token;
    }

    /**
     * 读取一个 ) 运算符，返回读取到的 token 的类型
     */
    private scanCloseParenToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        this.pos++;
        this.token = SyntaxKind.CloseParenToken;
        this.tokenValue = ')';
        return this.token;
    }

    /**
     * 读取一个 * 运算符，返回读取到的 token 的类型
     */
    private scanAsteriskToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        this.pos++;
        this.token = SyntaxKind.AsteriskToken;
        this.tokenValue = '*';
        return this.token;
    }

    /**
     * 读取一个 +，+=，++ 运算符，返回读取到的 token 的类型
     */
    private scanPlusToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        const ch = this.text.charCodeAt(this.pos + 1);

        if (ch === CharacterCodes.plus) {
            this.pos += 2;
            this.token = SyntaxKind.PlusPlusToken;
            this.tokenValue = '++';
            return this.token;
        }

        if (ch === CharacterCodes.equals) {
            this.pos += 2;
            this.token = SyntaxKind.PlusEqualsToken;
            this.tokenValue = '+=';
            return this.token;
        }

        this.pos++;
        this.token = SyntaxKind.PlusToken;
        this.tokenValue = '+';
        return this.token;
    }

    /**
     * 读取一个 -，--，-= 运算符，返回读取到的 token 的类型
     */
    private scanMinusToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        const ch = this.text.charCodeAt(this.pos + 1);

        if (ch === CharacterCodes.minus) {
            this.pos += 2;
            this.token = SyntaxKind.MinusMinusToken;
            this.tokenValue = '--';
            return this.token;
        }

        if (ch === CharacterCodes.equals) {
            this.pos += 2;
            this.token = SyntaxKind.MinusEqualsToken;
            this.tokenValue = '-=';
            return this.token;
        }

        this.pos++;
        this.token = SyntaxKind.MinusToken;
        this.tokenValue = '-';
        return this.token;
    }

    /**
     * 读取一个 , 分隔符，返回读取到的 token 的类型
     */
    private scanCommaToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        this.pos++;
        this.token = SyntaxKind.CommaToken;
        this.tokenValue = ',';
        return this.token;
    }

    /**
     * 读取一个 >，>= 运算符，返回读取到的 token 的类型
     */
    private scanGreaterThanToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        const ch = this.text.charCodeAt(this.pos + 1);

        if (ch === CharacterCodes.equals) {
            this.pos += 2;
            this.token = SyntaxKind.GreaterThanEqualsToken;
            this.tokenValue = '>=';
            return this.token;
        }

        this.pos++;
        this.token = SyntaxKind.GreaterThanToken;
        this.tokenValue = '>';
        return this.token;
    }

    /**
     * 读取一个 <，<= 运算符，返回读取到的 token 的类型
     */
    private scanLessThanToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        const ch = this.text.charCodeAt(this.pos + 1);

        if (ch === CharacterCodes.equals) {
            this.pos += 2;
            this.token = SyntaxKind.LessThanEqualsToken;
            this.tokenValue = '<=';
            return this.token;
        }

        this.pos++;
        this.token = SyntaxKind.LessThanToken;
        this.tokenValue = '<';
        return this.token;
    }

    /**
     * 读取一个 = 或 == 运算符，返回读取到的 token 的类型
     */
    private scanEqualsToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        const ch = this.text.charCodeAt(this.pos + 1);

        if (ch === CharacterCodes.equals) {
            this.pos += 2;
            this.token = SyntaxKind.EqualsEqualsToken;
            this.tokenValue = '==';
            return this.token;
        }

        this.pos++;
        this.token = SyntaxKind.EqualsToken;
        this.tokenValue = '=';
        return this.token;
    }

    /**
     * 读取一个 { ，返回读取到的 token 的类型
     */
    private scanOpenBraceToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        this.pos++;
        this.token = SyntaxKind.OpenBraceToken;
        this.tokenValue = '{';
        return this.token;
    }

    /**
     * 读取一个 } ，返回读取到的 token 的类型
     */
    private scanCloseBraceToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        this.pos++;
        this.token = SyntaxKind.CloseBraceToken;
        this.tokenValue = '}';
        return this.token;
    }

    /**
     * 读取一个 [ ，返回读取到的 token 的类型
     */
    private scanOpenBracketToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        this.pos++;
        this.token = SyntaxKind.OpenBracketToken;
        this.tokenValue = '[';
        return this.token;
    }

    /**
     * 读取一个 ] ，返回读取到的 token 的类型
     */
    private scanCloseBracketToken(): SyntaxKind {
        if (
            this.pos === undefined
            || this.end === undefined
            || this.text === undefined
        ) {
            throw new Error('scanner is not initialized');
        }

        this.pos++;
        this.token = SyntaxKind.CloseBracketToken;
        this.tokenValue = ']';
        return this.token;
    }

    /**
     * 报错
     *
     * @param message 错误信息
     * @param pos 当前扫描到的字符位置
     */
    private error(message: string, pos: number) {
        if (this.onError) {
            this.onError(message, pos);
        }
        this.tokenValue = undefined;
        this.token = SyntaxKind.Unknown;
        return this.token;
    }

}
