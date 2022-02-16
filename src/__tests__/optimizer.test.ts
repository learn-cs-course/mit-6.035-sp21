/**
 * @file 优化器测试用例
 */
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import main from '../main';

const GCC_BIN = '/opt/compiler/gcc-10/bin/gcc';

const optimizerTestInputDir = path.resolve(__dirname, 'optimizer/input');
const optimizerTestOutputDir = path.resolve(__dirname, 'optimizer/output');
const optimizerTestDataDir = path.resolve(__dirname, 'optimizer/data');
const optimizerTestLibPath = path.resolve(__dirname, 'optimizer/lib');
const optimizerInputCases = fs.readdirSync(optimizerTestInputDir, 'utf-8').filter(
    name => name.endsWith('.dcf')
);

describe('optimizer basic cases', () => {

    optimizerInputCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            // 编译读入文件生成汇编代码
            const filePath = path.resolve(optimizerTestInputDir, filename);
            const assemblyCode = main(filePath, {target: 'assembly'}) as string;

            // 汇编代码写入到文件
            const assemblyFile = path.resolve(optimizerTestInputDir, `${filename}.s`);
            fs.writeFileSync(assemblyFile, assemblyCode, 'utf-8');

            // gcc 编译写入的文件
            cp.execSync(
                // eslint-disable-next-line max-len
                `${GCC_BIN} -no-pie -o ../data/${filename}.o -L ${optimizerTestLibPath} ${assemblyFile} -l6035 -lpthread`,
                {cwd: optimizerTestInputDir}
            );

            cp.execSync(`./${filename}.o`, {cwd: optimizerTestDataDir});

            // 获取预期的文件输出
            const expectOutFilePath = path.resolve(optimizerTestOutputDir, `${filename.replace('.dcf', '')}.pgm`);
            const expectOut = fs.readFileSync(expectOutFilePath, 'utf-8');

            const outFilePath = path.resolve(optimizerTestDataDir, `${filename.replace('.dcf', '')}.pgm`);
            const out = fs.readFileSync(outFilePath, 'utf-8');

            expect(out).toBe(expectOut);
        });
    });

});
