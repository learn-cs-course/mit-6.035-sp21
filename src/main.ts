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

function handleScan(scanner: Scanner, filaname: string) {
    const text = scanner.getText();
    const lineStart = computeLineStarts(text);
    const output = [];

    scanner.setOnError((message, pos) => {
        const {line, character} = computeLineAndCharacterOfPosition(lineStart, pos);
        if (character === 0) {
            const res = `${filaname} line ${line}:${lineStart[line] - lineStart[line - 1]}: ${message}`;
            output.push(res);
        }
        else {
            const res = `${filaname} line ${line + 1}:${character + 1}: ${message}`;
            output.push(res);
        }
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
