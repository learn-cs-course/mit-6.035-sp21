/**
 * @file 优化器测试用例
 */
import * as fs from 'fs';
import * as path from 'path';
import * as cp from 'child_process';
import main from '../main';

const GCC_BIN = '/opt/compiler/gcc-10/bin/gcc';

const derbyTestInputDir = path.resolve(__dirname, 'derby/input');
const derbyTestOutputDir = path.resolve(__dirname, 'derby/output');
const derbyTestDataDir = path.resolve(__dirname, 'derby/data');
const derbyTestLibPath = path.resolve(__dirname, 'derby/lib');
const derbyInputCases = fs.readdirSync(derbyTestInputDir, 'utf-8').filter(
    name => name.endsWith('.dcf')
);

describe('derby basic cases', () => {

    derbyInputCases.forEach((filename: string) => {
        test(`${filename}`, () => {
            // 编译读入文件生成汇编代码
            const filePath = path.resolve(derbyTestInputDir, filename);
            const assemblyCode = main(filePath, {target: 'assembly'}) as string;

            // 汇编代码写入到文件
            const assemblyFile = path.resolve(derbyTestInputDir, `${filename}.s`);
            fs.writeFileSync(assemblyFile, assemblyCode, 'utf-8');

            // gcc 编译写入的文件
            cp.execSync(
                // eslint-disable-next-line max-len
                `${GCC_BIN} -no-pie -o ../data/${filename}.o -L ${derbyTestLibPath} ${assemblyFile} -l6035 -lpthread`,
                {cwd: derbyTestInputDir}
            );

            cp.execSync(`./${filename}.o`, {cwd: derbyTestDataDir});

            // 获取预期的文件输出
            const expectOutFilePath = path.resolve(derbyTestOutputDir, 'golden.ppm');
            const expectOut = fs.readFileSync(expectOutFilePath, 'utf-8');

            const outFilePath = path.resolve(derbyTestDataDir, 'output.ppm');
            const out = fs.readFileSync(outFilePath, 'utf-8');

            expect(out).toBe(expectOut);
        });
    });

});
