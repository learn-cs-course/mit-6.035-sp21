import * as fs from 'fs';
import * as path from 'path';
import {handleScan} from './handleScan';
import {Scanner} from './scanner';

interface Options {
    target: 'scan' | 'parse' | 'inter' | 'assembly';
    output?: string;
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
