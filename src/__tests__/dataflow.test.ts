import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import main from '../main';

const GCC_BIN = '/opt/compiler/gcc-10/bin/gcc';

const dataflowTestInputDir = path.resolve(__dirname, 'dataflow/input');
const dataflowTestOutputDir = path.resolve(__dirname, 'dataflow/output');
const dataflowTestLibPath = path.resolve(__dirname, 'dataflow/lib');
const dataflowInputCases = fs.readdirSync(dataflowTestInputDir, 'utf-8').filter(
    name => name.endsWith('.dcf')
);

describe('dataflow basic cases', () => {

    dataflowInputCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            // 编译读入文件生成汇编代码
            const filePath = path.resolve(dataflowTestInputDir, filename);
            const assemblyCode = main(filePath, {target: 'assembly'}) as string;

            // 汇编代码写入到文件
            const assemblyFile = path.resolve(dataflowTestInputDir, `${filename}.s`);
            fs.writeFileSync(assemblyFile, assemblyCode, 'utf-8');

            // gcc 编译写入的文件
            cp.execSync(
                `${GCC_BIN} -no-pie -o ${filename}.o -L ${dataflowTestLibPath} -l6035 ${assemblyFile}`,
                {cwd: dataflowTestInputDir}
            );

            // 获取预期的 stdout
            const expectStdoutFilePath = path.resolve(dataflowTestOutputDir, `${filename}.out`);
            const expectStdout = fs.readFileSync(expectStdoutFilePath, 'utf-8');

            // 不包含运行时错误的情况，执行代码，对比 stdout 即可
            const stdout = cp.execSync(`./${filename}.o`, {encoding: 'utf-8', cwd: dataflowTestInputDir});
            expect(stdout).toBe(expectStdout);
        });
    });

});

const dataflowHiddenTestInputDir = path.resolve(__dirname, 'dataflow-hidden/input');
const dataflowHiddenTestOutputDir = path.resolve(__dirname, 'dataflow-hidden/output');
const dataflowHiddenTestErrorDir = path.resolve(__dirname, 'dataflow-hidden/error');
const dataflowHiddenTestLibPath = path.resolve(__dirname, 'dataflow-hidden/lib');
const dataflowHiddenInputCases = fs.readdirSync(dataflowHiddenTestInputDir, 'utf-8').filter(
    name => name.endsWith('.dcf')
);

describe('dataflow hidden cases', () => {

    dataflowHiddenInputCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            // 编译读入文件生成汇编代码
            const filePath = path.resolve(dataflowHiddenTestInputDir, filename);
            const assemblyCode = main(filePath, {target: 'assembly'}) as string;

            // 汇编代码写入到文件
            const assemblyFile = path.resolve(dataflowHiddenTestInputDir, `${filename}.s`);
            fs.writeFileSync(assemblyFile, assemblyCode, 'utf-8');

            // gcc 编译写入的文件
            cp.execSync(
                `${GCC_BIN} -no-pie -o ${filename}.o -L ${dataflowHiddenTestLibPath} -l6035 ${assemblyFile}`,
                {cwd: dataflowHiddenTestInputDir}
            );

            // 获取预期的 stdout
            const expectStdoutFilePath = path.resolve(dataflowHiddenTestOutputDir, `${filename}.out`);
            const expectStdout = fs.readFileSync(expectStdoutFilePath, 'utf-8');

            // 不包含运行时错误的情况，执行代码，对比 stdout 即可
            const stdout = cp.execSync(`./${filename}.o`, {encoding: 'utf-8', cwd: dataflowHiddenTestInputDir});
            expect(stdout).toBe(expectStdout);
        });
    });

});
