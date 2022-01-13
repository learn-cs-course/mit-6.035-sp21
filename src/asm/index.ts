/**
 * @file 汇编生成
 */

import {ProgramNode, IRCodeType} from '../types/grammar';
import {genIR} from '../ir';

export function genAssembly(ast: ProgramNode) {
    const ir = genIR(ast);

    const asm = [];

    if (ir.constants.length > 0) {
        // todo
    }

    asm.push('.section .text');

    if (ir.globals.length > 0) {
        // todo
    }

    ir.methods.forEach(method => {
        asm.push(`.globl ${method.name}`);
        asm.push('');
        asm.push(`${method.name}:`);

        method.codes.forEach(irCode => {
            switch (irCode.type) {
                case IRCodeType.enter:
                {
                    // todo
                    const size = 0;
                    asm.push(`    enter $${size}, $0`);
                    asm.push('');
                    break;
                }
                case IRCodeType.return:
                {
                    if (method.name === 'main') {
                        asm.push('    movq $0, %rax');
                    }
                    asm.push('    leave');
                    asm.push('    ret');
                    break;
                }
            }
        });
    });

    return asm.join('\n');
}
