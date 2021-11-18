import * as fs from 'fs';
import * as path from 'path';
// import {createScanner, Scanner, } from './scanner';
import {Scanner} from './scanner/scanner';
import {computeLineStarts, computeLineOfPosition, computeLineAndCharacterOfPosition} from './scanner/utils';
import {SyntaxKind} from './types/grammar';

interface Options {
    target: 'scan' | 'parse' | 'inter' | 'assembly';
    output?: string;
}

function getPrintType(kind: SyntaxKind) {
    if (kind === SyntaxKind.CharLiteral) {
        return 'CHARLITERAL';
    }
    if (kind === SyntaxKind.IntLiteral) {
        return 'INTLITERAL';
    }
    if (kind === SyntaxKind.TrueKeyword || kind === SyntaxKind.FalseKeyword) {
        return 'BOOLEANLITERAL';
    }
    if (kind === SyntaxKind.StringLiteral) {
        return 'STRINGLITERAL';
    }
    if (kind === SyntaxKind.Identifier) {
        return 'IDENTIFIER';
    }
    return null;
}

/**
 * 获取结束位置在文本编辑器中实际显示的宽度
 *
 * @param text 文本
 * @param startPos 开始位置
 * @param endPos 结束位置
 * @returns
 */
function getPrintColumnNumber(
    text: string,
    startPos: number,
    endPos: number,
) {
    let number = 0;
    for (let i = 0; i < endPos + 1; i++) {
        if (text.charAt(startPos + i) === '\t') {
            // 如果求位置的字符就是 tab，则长度 +1
            if (i === endPos) {
                number++;
            }
            // 否则，tab 字符会将整个长度向 8 的整数倍补齐
            // 因此 number 要增加的长度是当前长度与其最近的 8 的整数倍的差值
            // 该值可以通过对 number 对 8 取余，得到的余数再被 8 减得到
            else {
                number += (8 - number % 8);
            }
        }
        else {
            number++;
        }
    }
    return number;
}

function handleScan(scanner: Scanner, filaname: string) {
    const text = scanner.getText();
    const lineStart = computeLineStarts(text);
    const output = [];

    scanner.setOnError((message, pos) => {
        const {line, character} = computeLineAndCharacterOfPosition(lineStart, pos);
        const column = getPrintColumnNumber(text, lineStart[line], character);
        const res = `${filaname} line ${line + 1}:${column}: ${message}`;
        output.push(res);
    });

    // eslint-disable-next-line no-constant-condition
    while (true) {
        scanner.scan();
        if (scanner.getToken() === SyntaxKind.EndOfFileToken) {
            break;
        }
        if (scanner.getToken() === SyntaxKind.Unknown) {
            continue;
        }
        const lineNumber = computeLineOfPosition(lineStart, scanner.getTokenPos());
        const printType = getPrintType(scanner.getToken());

        const res: string[] = [`${lineNumber + 1}`];
        if (printType) {
            res.push(printType);
        }
        res.push(scanner.getTokenValue()!);

        output.push(res.join(' '));
    }

    return output.join('\n') + '\n';
}

export default function main(filePath: string, options: Options) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);

    const scanner = new Scanner();
    scanner.setText(code);
    if (options.target === 'scan') {
        const output = handleScan(scanner, filename);
        // 假装是 stdout
        return output;
    }
}
