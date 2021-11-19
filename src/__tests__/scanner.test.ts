import * as fs from 'fs';
import * as path from 'path';
import main from '../main';

const scannerTestInputDir = path.resolve(__dirname, 'scanner/input');
const scannerTestOutputDir = path.resolve(__dirname, 'scanner/output');
// const cases = fs.readdirSync(scannerTestInputDir, 'utf-8');
const cases = [
    'char1', 'char2', 'char3', 'char4', 'char5', 'char6', 'char7', 'char8', 'char9',
    'op1',
];

describe('scanner basic cases', () => {

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

const scannerHiddenTestInputDir = path.resolve(__dirname, 'scanner-hidden/input');
const scannerHiddenTestOutputDir = path.resolve(__dirname, 'scanner-hidden/output');
// const hiddenCases = fs.readdirSync(scannerHiddenTestInputDir, 'utf-8');
const hiddenCases = [
    'char10', 'char12', 'char13', 'char14', 'char15',
    'op4', 'op5', 'op8',
];

describe('scanner hidden cases', () => {

    hiddenCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(scannerHiddenTestInputDir, filename);
            const output = main(filePath, {target: 'scan'});

            const expectOutputPath = path.resolve(scannerHiddenTestOutputDir, `${filename}.out`);
            const expectOutput = fs.readFileSync(expectOutputPath, 'utf8');

            expect(output).toBe(expectOutput);
        });
    });

});
