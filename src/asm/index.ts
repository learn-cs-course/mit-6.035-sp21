/**
 * @file 汇编生成
 */

import {ProgramNode, IRCodeType, SyntaxKind} from '../types/grammar';
import {genIR, ValueType, ArgumentIRCode} from '../ir';

class TmpSymbols {

    private readonly tmpMap = new Map<string, '%r10' | '%r11'>();

    private registerUseRecord = {
        '%r10': 0,
        '%r11': 0,
    };

    allocateTmp(name: string) {
        const register = this.getEmptyRegister();
        this.tmpMap.set(name, register);
        return register;
    }

    getTmpRegister(name: string) {
        return this.tmpMap.get(name);
    }

    replaceTmpName(before: string, after: string) {
        const register = this.getTmpRegister(before)!;
        this.tmpMap.delete(before);
        this.tmpMap.set(after, register);
        this.registerUseRecord[register] = Date.now();
    }

    removeTmp(name: string) {
        const register = this.getTmpRegister(name)!;
        this.tmpMap.delete(name);
        this.registerUseRecord[register] = 0;
    }

    private getEmptyRegister() {
        if (this.registerUseRecord['%r10'] === 0) {
            this.registerUseRecord['%r10'] = Date.now();
            return '%r10';
        }
        if (this.registerUseRecord['%r11'] === 0) {
            this.registerUseRecord['%r11'] = Date.now();
            return '%r11';
        }
        if (this.registerUseRecord['%r10'] < this.registerUseRecord['%r11']) {
            this.registerUseRecord['%r10'] = Date.now();
            return '%r10';
        }
        this.registerUseRecord['%r11'] = Date.now();
        return '%r11';
    }
}


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

        const tmpSymbols = new TmpSymbols();

        asm.push(`.globl ${method.name}`);
        asm.push('');
        asm.push(`${method.name}:`);

        // eslint-disable-next-line @typescript-eslint/prefer-for-of
        for (let i = 0; i < method.codes.length; i++) {
            const irCode = method.codes[i];
            switch (irCode.type) {
                case IRCodeType.enter:
                {
                    const size = method.localSize % 16 === 0
                        ? method.localSize
                        : method.localSize + (16 - method.localSize % 16);
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
                    const stack: ArgumentIRCode[] = [];
                    stack.push(irCode);
                    while (method.codes[i + 1].type === IRCodeType.argument) {
                        stack.push(method.codes[i + 1] as ArgumentIRCode);
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
                            asm.push(`    movq $${code.label}, ${register}`);
                        }
                        else if (code.kind === SyntaxKind.Identifier) {
                            asm.push(`    movq ${code.offset}(%rbp), ${register}`);
                        }
                        else {
                            // @todo
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
                case IRCodeType.assign:
                {
                    if (irCode.left.type !== ValueType.Identifier) {
                        throw new Error('un');
                    }
                    switch (irCode.right.type) {
                        case ValueType.Imm:
                        {
                            asm.push(`    movq $${irCode.right.value}, ${irCode.left.offset}(%rbp)`);
                            break;
                        }
                        case ValueType.Tmp:
                        {
                            const register = tmpSymbols.getTmpRegister(irCode.right.name);
                            asm.push(`    movq ${register}, ${irCode.left.offset}(%rbp)`);
                            break;
                        }
                        case ValueType.Identifier:
                        {
                            const register = tmpSymbols.allocateTmp(irCode.right.name);
                            asm.push(`    movq ${irCode.right.offset}(%rbp), ${register}`);
                            asm.push(`    movq ${register}, ${irCode.left.offset}(%rbp)`);
                            break;
                        }
                    }
                    asm.push('');
                    break;
                }
                // @todo 下面这坨代码，没有考虑左右都是 register 的情况
                case IRCodeType.binary:
                {
                    switch (irCode.operator) {
                        case SyntaxKind.PlusToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    addq ${irCode.right.offset}(%rbp), ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    addq $${irCode.left.value}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    addq $${irCode.right.value}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    addq $${irCode.left.value}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    addq $${irCode.right.value}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    addq ${irCode.right.offset}(%rbp), ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    addq ${irCode.left.offset}(%rbp), ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            break;
                        }
                        // @todo 减法不符合交换律，我下面写的一定哪里有问题，但我不知道哪里，我好累现在
                        case SyntaxKind.MinusToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    subq ${irCode.right.offset}(%rbp), ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                // @todo 减法没有交换律，这里有问题
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    subq $${irCode.left.value}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    subq $${irCode.right.value}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    subq $${irCode.left.value}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    subq $${irCode.right.value}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    subq ${irCode.right.offset}(%rbp), ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    subq ${irCode.left.offset}(%rbp), ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            break;
                        }
                        case SyntaxKind.AsteriskToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    imulq ${irCode.right.offset}(%rbp), ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    imulq $${irCode.left.value}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    imulq $${irCode.right.value}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    imulq $${irCode.left.value}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    imulq $${irCode.right.value}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    imulq ${irCode.right.offset}(%rbp), ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    imulq ${irCode.left.offset}(%rbp), ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            break;
                        }
                        case SyntaxKind.SlashToken:
                        {

                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), %rax`);
                                asm.push(`    movq ${irCode.right.offset}(%rbp) ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                // todo
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), %rax`);
                                asm.push(`    movq $${irCode.right.value}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                // todo
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Imm
                            ) {
                                // todo
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                // todo
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                // todo
                            }
                            break;

                        }
                        case SyntaxKind.PercentToken:
                        {

                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), %rax`);
                                asm.push(`    movq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                // todo
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {


                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), %rax`);
                                asm.push(`    movq $${irCode.right.value}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                // todo
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Imm
                            ) {
                                // todo
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                // todo
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                // todo
                            }
                            break;
                        }
                    }

                    asm.push('');
                    break;
                }
                case IRCodeType.label:
                {
                    asm.push(`${irCode.label}:`);
                    asm.push('');
                    break;
                }
                case IRCodeType.jump:
                {
                    asm.push(`    jmp ${irCode.targetLabel}`);
                    asm.push('');
                    break;
                }
                case IRCodeType.conditionalJump:
                {
                    switch (irCode.operator) {
                        case SyntaxKind.GreaterThanEqualsToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.left.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    cmpq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    jge ${irCode.targetLabel}`);
                            }
                            break;
                        }
                        case SyntaxKind.GreaterThanToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.left.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    cmpq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    jg ${irCode.targetLabel}`);
                            }
                            break;
                        }
                        case SyntaxKind.LessThanEqualsToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.left.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    cmpq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    jle ${irCode.targetLabel}`);
                            }
                            break;
                        }
                        case SyntaxKind.LessThanToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.left.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    cmpq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    jl ${irCode.targetLabel}`);
                            }
                            break;
                        }
                        case SyntaxKind.EqualsEqualsToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.left.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    cmpq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    je ${irCode.targetLabel}`);
                            }
                            break;
                        }
                        case SyntaxKind.ExclamationEqualsToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.left.name);
                                asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                                asm.push(`    cmpq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    jne ${irCode.targetLabel}`);
                            }
                            break;
                        }
                    }
                    asm.push('');
                }
            }
        }
    });

    return asm.join('\n');
}
