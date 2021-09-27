import * as fs from 'fs';
import * as path from 'path';
import {createScanner, Scanner} from './scanner';
import {computeLineStarts, computeLineOfPosition} from './scanner/utils';
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

function handleScan(scanner: Scanner) {
    const text = scanner.getText();
    const lineStart = computeLineStarts(text);
    const output = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
        try {
            scanner.scan();
        }
        catch (e: any) {
            // console.log(e.message);
        }
        if (scanner.getToken() === SyntaxKind.EndOfFileToken) {
            break;
        }
        const lineNumber = computeLineOfPosition(lineStart, scanner.getTokenPos());
        const printType = getPrintType(scanner.getToken());

        const res: string[] = [`${lineNumber + 1}`];
        if (printType) {
            res.push(printType);
        }
        res.push(scanner.getTokenValue());

        output.push(res.join(' '));
    }

    return output.join('\n') + '\n';
}

export default function main(filename: string, options: Options) {
    const filePath = path.resolve(process.cwd(), filename);
    const code = fs.readFileSync(filePath, 'utf-8');

    // const outputFilePath = path.join(process.cwd(), options.output);

    const scanner = createScanner();
    scanner.setText(code);
    if (options.target === 'scan') {
        const output = handleScan(scanner);
        // 假装是 stdout
        return output;
    }
}
