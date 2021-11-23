import * as fs from 'fs';
import * as path from 'path';
import main from '../main';

const parserTestLegalDir = path.resolve(__dirname, 'parser/legal');
const legalCases = fs.readdirSync(parserTestLegalDir, 'utf-8');

describe('parser basic legal cases', () => {

    legalCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(parserTestLegalDir, filename);
            const isLegal = main(filePath, {target: 'parse'});
            expect(isLegal).toBe(true);
        });
    });

});

const parserTestIllegalDir = path.resolve(__dirname, 'parser/illegal');
const illegalCases = fs.readdirSync(parserTestIllegalDir, 'utf-8');

describe('parser basic illegal cases', () => {

    illegalCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(parserTestIllegalDir, filename);
            const isLegal = main(filePath, {target: 'parse'});
            expect(isLegal).toBe(false);
        });
    });

});

const parserHiddenTestLegalDir = path.resolve(__dirname, 'parser-hidden/legal');
const legalHiddenCases = fs.readdirSync(parserHiddenTestLegalDir, 'utf-8');

describe('parser hidden legal cases', () => {

    legalHiddenCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(parserHiddenTestLegalDir, filename);
            const isLegal = main(filePath, {target: 'parse'});
            expect(isLegal).toBe(true);
        });
    });

});

const parserHiddenTestIllegalDir = path.resolve(__dirname, 'parser-hidden/illegal');
const illegalHiddenCases = fs.readdirSync(parserHiddenTestIllegalDir, 'utf-8');

describe('parser hidden illegal cases', () => {

    illegalHiddenCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(parserHiddenTestIllegalDir, filename);
            const isLegal = main(filePath, {target: 'parse'});
            expect(isLegal).toBe(false);
        });
    });

});
