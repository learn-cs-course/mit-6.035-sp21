import * as fs from 'fs';
import * as path from 'path';
import {handleScan} from './handleScan';
import {Scanner} from './scanner';
import {Parser} from './parser';
import {bindProgram} from './interpreter/bindProgram';
import {genAssembly} from './asm';
import {genIR} from './ir';

interface Options {
    target: 'scan' | 'parse' | 'inter' | 'assembly';
    output?: string;
}

export default function main(filePath: string, options: Options) {
    const code = fs.readFileSync(filePath, 'utf-8');
    const filename = path.basename(filePath);

    if (options.target === 'scan') {
        const scanner = new Scanner(code);
        const output = handleScan(scanner, filename);
        // 假装是 stdout
        return output;
    }
    else if (options.target === 'parse') {
        const parser = new Parser(code);
        const output = parser.parse();
        if (output === null) {
            return false;
        }
        return true;
    }
    else if (options.target === 'inter') {
        const parser = new Parser(code);
        const ast = parser.parse();
        if (ast === null) {
            return false;
        }
        try {
            bindProgram(ast);
            return true;
        }
        catch (e) {
            return false;
        }
    }
    else if (options.target === 'assembly') {
        const parser = new Parser(code);
        const ast = parser.parse();
        if (ast === null) {
            return '';
        }
        try {
            bindProgram(ast);
        }
        catch (e) {
            return '';
        }
        return genAssembly(ast);
    }
    else if (options.target === 'ir-debug') {
        const parser = new Parser(code);
        const ast = parser.parse();
        if (ast === null) {
            return '';
        }
        try {
            bindProgram(ast);
        }
        catch (e) {
            return '';
        }
        return genIR(ast);
    }
}
