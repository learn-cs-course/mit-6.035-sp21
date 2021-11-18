/**
 * @file diagnostics 词法分析过程中的错误信息
 */

import {isControlCharacter} from './utils';

interface DiagnosticMessage {
    code: string;
    message: string;
}

const unexpectedCharMessage: DiagnosticMessage = {
    code: 'unexpectedChar',
    message: 'unexpected char: {0}'
}

const expectingButFoundMessage: DiagnosticMessage = {
    code: 'expectingButFound',
    message: 'expecting {0}, found {1}'
}

function formatStringFromArgs(text: string, args: Array<string | number>): string {
    return text.replace(/{(\d+)}/g, (_match, index: string) => '' + args[+index]);
}

/**
 * 未预期的字符错误
 *
 * @param ch 字符
 * @returns 错误信息
 */
export function formatUnexpectedCharError(ch: number) {
    const errorArg = isControlCharacter(ch)
    ? `0x${ch.toString(16).toUpperCase()}`
    : `'${String.fromCharCode(ch)}'`;
    const errorMessage = formatStringFromArgs(
        unexpectedCharMessage.message,
        [errorArg]
    );
    return errorMessage;
}

/**
 * 与预期字符不匹配的错误
 *
 * @param ch 字符
 * @param expecting 预期字符
 * @returns 错误信息
 */
export function formatExpectingButFoundError(ch: number, expecting: string) {
    // 为了把 fromCharCode 10 转换成 \n
    const escapedCharByStringify = JSON.stringify(String.fromCharCode(ch)).replace(/"/g, '');
    const escapedChar = escapedCharByStringify === '\\\\' ? '\\' : escapedCharByStringify;
    const errorArg = `'${escapedChar}'`;
    const errorMessage = formatStringFromArgs(
        expectingButFoundMessage.message,
        [`'${expecting}'`, errorArg]
    );
    return errorMessage;
}
