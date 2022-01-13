import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import main from '../main';

const codegenTestInputDir = path.resolve(__dirname, 'codegen/input');
const codegenTestOutputDir = path.resolve(__dirname, 'codegen/output');
// const codegenInputCases = fs.readdirSync(codegenTestInputDir, 'utf-8');
const codegenInputCases = ['00-empty.dcf'];

describe('codegen basic cases', () => {

    codegenInputCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            const filePath = path.resolve(codegenTestInputDir, filename);
            const assemblyCode = main(filePath, {target: 'assembly'}) as string;

            const assemblyFile = path.resolve(codegenTestInputDir, `${filename}.s`);
            fs.writeFileSync(assemblyFile, assemblyCode, 'utf-8');
            cp.execSync(`gcc ${assemblyFile} -o ${filename}.o`, {cwd: codegenTestInputDir});
            try {
                const stdout = cp.execSync(`./${filename}.o`, {encoding: 'utf-8'});
                const expectStdoutFilePath = path.resolve(codegenTestOutputDir, `${filename}.out`);
                const expectStdout = fs.readFileSync(expectStdoutFilePath, 'utf-8');
                expect(stdout).toBe(expectStdout);
            }
            catch (e) {
                // 非 0 退出码
                console.log(e);
            }
        });
    });

});
