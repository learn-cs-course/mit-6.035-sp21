/**
 * @file 汇编生成
 */

import {ProgramNode, IRCodeType, SyntaxKind} from '../types/grammar';
import {genIR} from '../ir';

const CALLING_CONVENTION_REGISTERS = [
    '%rdi',
    '%rsi',
    '%rdx',
    '%rcx',
    '%r8',
    '%r9',
];

export function genAssembly(ast: ProgramNode) {
    const ir = genIR(ast);

    const asm = [];

    if (ir.constants.size > 0) {
        asm.push('.section .rodata');
        for (const [stringLiteral, index] of ir.constants.entries()) {
            asm.push(`.msg${index}:`);
            asm.push(`    .string ${stringLiteral}`);
        }
        asm.push('');
    }

    asm.push('.section .text');

    if (ir.globals.length > 0) {
        // todo
    }

    ir.methods.forEach(method => {
        asm.push(`.globl ${method.name}`);
        asm.push('');
        asm.push(`${method.name}:`);

        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < method.codes.length; i++) {
            const irCode = method.codes[i];
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
                    asm.push('');
                    break;
                }
                case IRCodeType.argument:
                {
                    const stack = [];
                    stack.push(irCode);
                    while (method.codes[i + 1].type === IRCodeType.argument) {
                        stack.push(irCode);
                        i++;
                    }
                    const callIRCode = method.codes[i + 1];
                    if (
                        callIRCode.type !== IRCodeType.call
                        || callIRCode.length !== stack.length
                    ) {
                        throw new Error('unexpected error: ir call position');
                    }

                    while (stack.length > 0) {
                        const code = stack.pop()!;
                        if (stack.length >= 6) {
                            // todo add params on stack
                            continue;
                        }
                        const register = CALLING_CONVENTION_REGISTERS[stack.length];
                        if (code.kind === SyntaxKind.StringLiteral) {
                            asm.push(`    movq $${code.value}, ${register}`);
                        }
                        else {
                            // todo
                        }
                    }

                    break;
                }
                case IRCodeType.call:
                {
                    asm.push(`    call ${irCode.name}`);
                    asm.push('');
                    break;
                }
            }
        }
    });

    return asm.join('\n');
}
