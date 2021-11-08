import * as fs from 'fs';
import * as path from 'path';
import main from '../main';

const scannerTestInputDir = path.resolve(__dirname, 'scanner/input');
const scannerTestOutputDir = path.resolve(__dirname, 'scanner/output');
// const cases = fs.readdirSync(scannerTestInputDir, 'utf-8');
const cases = ['char1', 'char2', 'hexlit1'];

describe('scanner basic case', () => {

    cases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(scannerTestInputDir, filename);
            const output = main(filePath, {target: 'scan'});

            const expectOutputPath = path.resolve(scannerTestOutputDir, `${filename}.out`);
            const expectOutput = fs.readFileSync(expectOutputPath, 'utf8');

            expect(output).toBe(expectOutput);
        });
    });

});
