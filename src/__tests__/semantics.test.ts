import * as fs from 'fs';
import * as path from 'path';
import main from '../main';

const semanticsTestLegalDir = path.resolve(__dirname, 'semantics/legal');
const legalCases = fs.readdirSync(semanticsTestLegalDir, 'utf-8');

describe('semantics basic legal cases', () => {

    legalCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(semanticsTestLegalDir, filename);
            const isLegal = main(filePath, {target: 'inter'});
            expect(isLegal).toBe(true);
        });
    });

});

const semanticsTestIllegalDir = path.resolve(__dirname, 'semantics/illegal');
const illegalCases = fs.readdirSync(semanticsTestIllegalDir, 'utf-8');

describe('semantics basic illegal cases', () => {

    illegalCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(semanticsTestIllegalDir, filename);
            const isLegal = main(filePath, {target: 'inter'});
            expect(isLegal).toBe(false);
        });
    });

});

const semanticsHiddenTestLegalDir = path.resolve(__dirname, 'semantics-hidden/legal');
const legalHiddenCases = fs.readdirSync(semanticsHiddenTestLegalDir, 'utf-8');

describe('semantics hidden legal cases', () => {

    legalHiddenCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(semanticsHiddenTestLegalDir, filename);
            const isLegal = main(filePath, {target: 'inter'});
            expect(isLegal).toBe(true);
        });
    });

});

const semanticsHiddenTestIllegalDir = path.resolve(__dirname, 'semantics-hidden/illegal');
const illegalHiddenCases = fs.readdirSync(semanticsHiddenTestIllegalDir, 'utf-8');

describe('semantics hidden illegal cases', () => {

    illegalHiddenCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(semanticsHiddenTestIllegalDir, filename);
            const isLegal = main(filePath, {target: 'inter'});
            expect(isLegal).toBe(false);
        });
    });

});
