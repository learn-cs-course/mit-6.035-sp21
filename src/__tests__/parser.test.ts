// import * as fs from 'fs';
import * as path from 'path';
import main from '../main';

const parserTestLegalDir = path.resolve(__dirname, 'parser/legal');
// const legalCases = fs.readdirSync(parserTestLegalDir, 'utf-8');
const legalCases = ['legal-01', 'legal-02', 'legal-03'];

describe('parser basic legal cases', () => {

    legalCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(parserTestLegalDir, filename);
            const isLegal = main(filePath, {target: 'parse'});
            expect(isLegal).toBe(true);
        });
    });

});

// const parserTestIllegalDir = path.resolve(__dirname, 'parser/illegal');
// const illegalCases = fs.readdirSync(parserTestIllegalDir, 'utf-8');

// describe('parser basic illegal cases', () => {

//     illegalCases.forEach((filename: string) => {
//         test(`${filename}`, () => {
//             const filePath = path.resolve(parserTestIllegalDir, filename);
//             const isLegal = main(filePath, {target: 'parse'});
//             expect(isLegal).toBe(false);
//         });
//     });

// });
