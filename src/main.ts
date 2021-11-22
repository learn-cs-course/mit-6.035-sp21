import * as fs from 'fs';
import * as path from 'path';
import {handleScan} from './handleScan';
import {Scanner} from './scanner';
import {Parser} from './parser';

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

}
