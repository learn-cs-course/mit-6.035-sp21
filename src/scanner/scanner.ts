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
                    this.pos++;
                    this.token = SyntaxKind.SlashToken;
                    return this.token;

                case CharacterCodes.singleQuote:
                    return this.scanCharLiteral();

                default:
                    this.pos++;

            }

        }
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
