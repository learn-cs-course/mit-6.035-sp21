import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import main from '../main';

const GCC_BIN = '/opt/compiler/gcc-10/bin/gcc';

interface ExecSyncError extends Error {
    status: number;
    stdout: string;
    stderr: string;
}

const codegenTestInputDir = path.resolve(__dirname, 'codegen/input');
const codegenTestOutputDir = path.resolve(__dirname, 'codegen/output');
const codegenTestErrorDir = path.resolve(__dirname, 'codegen/error');
const codegenTestLibPath = path.resolve(__dirname, 'codegen/lib');
// const codegenInputCases = fs.readdirSync(codegenTestInputDir, 'utf-8');
const codegenInputCases: string[] = [
    '00-empty.dcf',
    '01-import.dcf',
    '02-expr.dcf',
    '03-math.dcf',
    '04-math2.dcf',
    '05-calls.dcf',
    '06-control-flow.dcf',
    '07-recursion.dcf',
    '08-array.dcf',
    '09-global.dcf',
    '10-bounds.dcf',
    '11-big-array.dcf',
    '12-huge.dcf',
    '13-ifs.dcf',
    '14-shortcircuit.dcf',
    '15-not.dcf',
];

describe('codegen basic cases', () => {

    codegenInputCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            // 编译读入文件生成汇编代码
            const filePath = path.resolve(codegenTestInputDir, filename);
            const assemblyCode = main(filePath, {target: 'assembly'}) as string;

            // 汇编代码写入到文件
            const assemblyFile = path.resolve(codegenTestInputDir, `${filename}.s`);
            fs.writeFileSync(assemblyFile, assemblyCode, 'utf-8');

            // gcc 编译写入的文件
            cp.execSync(
                `${GCC_BIN} -no-pie -o ${filename}.o -L ${codegenTestLibPath} -l6035 ${assemblyFile}`,
                {cwd: codegenTestInputDir}
            );

            // 获取预期的 stdout
            const expectStdoutFilePath = path.resolve(codegenTestOutputDir, `${filename}.out`);
            const expectStdout = fs.readFileSync(expectStdoutFilePath, 'utf-8');

            try {
                // 不包含运行时错误的情况，执行代码，对比 stdout 即可
                const stdout = cp.execSync(`./${filename}.o`, {encoding: 'utf-8', cwd: codegenTestInputDir});
                expect(stdout).toBe(expectStdout);
            }
            catch (e) {
                // 如果是 expect throw error，继续抛出去
                if ((e as Error).hasOwnProperty('matcherResult')) {
                    throw e;
                }

                // 包含运行时错误的情况，对比 exit code、stdout、stderr
                const {status, stdout, stderr} = e as ExecSyncError;

                const expectErrorStatusCodeFilePath = path.resolve(codegenTestErrorDir, `${filename}.err`);

                // 如果是非运行时检查导致的错误情况，如汇编不合法导致的段错误，继续抛出去
                if (!fs.existsSync(expectErrorStatusCodeFilePath)) {
                    throw e;
                }

                const expectErrorStatusCodeString = fs.readFileSync(expectErrorStatusCodeFilePath, 'utf-8');
                const expectErrorStatusCode = parseInt(expectErrorStatusCodeString.trim(), 10);

                expect(status).toBe(expectErrorStatusCode);
                expect(`${stdout}${stderr}`).toBe(expectStdout);
            }
        });
    });

});

const codegenHiddenTestInputDir = path.resolve(__dirname, 'codegen-hidden/input');
const codegenHiddenTestOutputDir = path.resolve(__dirname, 'codegen-hidden/output');
const codegenHiddenTestErrorDir = path.resolve(__dirname, 'codegen-hidden/error');
const codegenHiddenTestLibPath = path.resolve(__dirname, 'codegen-hidden/lib');
// const codegenHiddenInputCases = fs.readdirSync(codegenHiddenTestInputDir, 'utf-8');
const codegenHiddenInputCases: string[] = [
    'hidden-09-loop-step.dcf',
    'hidden-16-return-zero.dcf',
];

describe('codegen basic cases', () => {

    codegenHiddenInputCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            // 编译读入文件生成汇编代码
            const filePath = path.resolve(codegenHiddenTestInputDir, filename);
            const assemblyCode = main(filePath, {target: 'assembly'}) as string;

            // 汇编代码写入到文件
            const assemblyFile = path.resolve(codegenHiddenTestInputDir, `${filename}.s`);
            fs.writeFileSync(assemblyFile, assemblyCode, 'utf-8');

            // gcc 编译写入的文件
            cp.execSync(
                `${GCC_BIN} -no-pie -o ${filename}.o -L ${codegenHiddenTestLibPath} -l6035 ${assemblyFile}`,
                {cwd: codegenHiddenTestInputDir}
            );

            // 获取预期的 stdout
            const expectStdoutFilePath = path.resolve(codegenHiddenTestOutputDir, `${filename}.out`);
            const expectStdout = fs.readFileSync(expectStdoutFilePath, 'utf-8');

            try {
                // 不包含运行时错误的情况，执行代码，对比 stdout 即可
                const stdout = cp.execSync(`./${filename}.o`, {encoding: 'utf-8', cwd: codegenHiddenTestInputDir});
                expect(stdout).toBe(expectStdout);
            }
            catch (e) {
                // 如果是 expect throw error，继续抛出去
                if ((e as Error).hasOwnProperty('matcherResult')) {
                    throw e;
                }

                // 包含运行时错误的情况，对比 exit code、stdout、stderr
                const {status, stdout, stderr} = e as ExecSyncError;

                const expectErrorStatusCodeFilePath = path.resolve(codegenHiddenTestErrorDir, `${filename}.err`);

                // 如果是非运行时检查导致的错误情况，如汇编不合法导致的段错误，继续抛出去
                if (!fs.existsSync(expectErrorStatusCodeFilePath)) {
                    throw e;
                }

                const expectErrorStatusCodeString = fs.readFileSync(expectErrorStatusCodeFilePath, 'utf-8');
                const expectErrorStatusCode = parseInt(expectErrorStatusCodeString.trim(), 10);

                expect(status).toBe(expectErrorStatusCode);
                expect(`${stdout}\n${stderr}`).toBe(expectStdout);
            }
        });
    });

});
