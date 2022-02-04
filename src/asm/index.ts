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
        if (name === 'returnValue') {
            // @todo 我无所谓了，来吧
            return '%rax' as unknown as '%r10';
        }
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
                    [...method.parameters.values()].forEach((parameter, index) => {
                        const register = CALLING_CONVENTION_REGISTERS[index];
                        asm.push(`    movq ${register}, ${parameter.offset}(%rbp)`);
                    });
                    asm.push('');
                    break;
                }
                case IRCodeType.return:
                {
                    if (!irCode.value) {
                        break;
                    }
                    if (irCode.value.type === ValueType.Imm) {
                        asm.push(`    movq $${irCode.value.value}, %rax`);
                    }
                    if (irCode.value.type === ValueType.Tmp) {
                        const register = tmpSymbols.getTmpRegister(irCode.value.name);
                        asm.push(`    movq ${register}, %rax`);
                    }
                    if (irCode.value.type === ValueType.Identifier) {
                        asm.push(`    movq ${irCode.value.offset}(%rbp), %rax`);
                    }
                    break;
                }
                case IRCodeType.exit:
                {
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

                    if (callIRCode.length >= 6 && callIRCode.length % 2 !== 0) {
                        asm.push('    subq $8, %rsp');
                    }

                    while (stack.length > 0) {
                        const code = stack.pop()!;
                        if (stack.length >= 6) {
                            if (code.kind === SyntaxKind.StringLiteral) {
                                asm.push(`    pushq $${code.label}`);
                            }
                            else if (code.kind === SyntaxKind.Identifier) {
                                asm.push(`    pushq ${code.offset}(%rbp)`);
                            }
                            else if (code.kind === SyntaxKind.IntLiteral) {
                                asm.push(`    pushq $${code.value}`);
                            }
                            else if (code.kind === ValueType.Tmp) {
                                const register = tmpSymbols.getTmpRegister(code.tmpName);
                                asm.push(`    pushq ${register}`);
                            }
                            continue;
                        }
                        const register = CALLING_CONVENTION_REGISTERS[stack.length];
                        if (code.kind === SyntaxKind.StringLiteral) {
                            asm.push(`    movq $${code.label}, ${register}`);
                        }
                        else if (code.kind === SyntaxKind.Identifier) {
                            asm.push(`    movq ${code.offset}(%rbp), ${register}`);
                        }
                        else if (code.kind === SyntaxKind.IntLiteral) {
                            asm.push(`    movq $${code.value}, ${register}`);
                        }
                        else if (code.kind === ValueType.Tmp) {
                            const tmpRegister = tmpSymbols.getTmpRegister(code.tmpName);
                            asm.push(`    movq ${tmpRegister}, ${register}`);
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
                    if (irCode.length > 6) {
                        const delta = irCode.length - 6;
                        if (delta % 2 === 0) {
                            asm.push(`    addq $${delta * 8}, %rsp`);
                        }
                        else {
                            asm.push(`    addq $${(delta + 1) * 8}, %rsp`);
                        }
                    }
                    asm.push('');
                    break;
                }
                case IRCodeType.assign:
                {
                    if (irCode.left.type === ValueType.Identifier) {
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
                    }
                    else if (irCode.left.type === ValueType.ArrayLocation) {
                        const offset = irCode.left.offset;
                        const indexPos = (() => {
                            switch (irCode.left.index.type) {
                                case ValueType.Imm:
                                    throw new Error('todo');
                                case ValueType.Tmp:
                                {
                                    return tmpSymbols.getTmpRegister(irCode.left.index.name);
                                }
                                case ValueType.Identifier:
                                {
                                    // @todo 用 r14 存 index
                                    const register = '%r14';
                                    asm.push(`    movq ${irCode.left.index.offset}(%rbp), ${register}`);
                                    return register;
                                }
                                case ValueType.Parameter:
                                    throw new Error('todo');
                            }
                        })();
                        const pos = offset === 200
                            ? `${irCode.left.name}(,${indexPos}, ${irCode.left.typeSize})`
                            : 'todo';
                        switch (irCode.right.type) {
                            case ValueType.Imm:
                            {
                                asm.push(`    movq $${irCode.right.value}, ${pos}`);
                                break;
                            }
                            case ValueType.Tmp:
                            {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq ${register}, ${pos}`);
                                break;
                            }
                            case ValueType.Identifier:
                            {
                                const register = tmpSymbols.allocateTmp(irCode.right.name);
                                asm.push(`    movq ${irCode.right.offset}(%rbp), ${register}`);
                                asm.push(`    movq ${register}, ${pos}`);
                                break;
                            }
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
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    addq ${rightPos}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    addq ${rightPos}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                // 这里利用了交换律，需要注意
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    addq ${leftPos}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    addq $${irCode.right.value}, ${register}`);
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
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq $${irCode.left.value}, ${register}`);
                                asm.push(`    subq ${irCode.right.offset}(%rbp), ${register}`);
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
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    subq ${rightPos}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    subq ${rightPos}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    subq $${irCode.right.value}, ${register}`);
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
                                // 这里利用了交换律，需要注意
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    imulq ${irCode.left.offset}(%rbp), ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    imulq ${rightPos}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    imulq ${rightPos}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                // 这里利用了交换律，需要注意
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    imulq ${leftPos}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    imulq $${irCode.right.value}, ${register}`);
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
                    if (
                        irCode.left.type === ValueType.Identifier
                        && irCode.right.type === ValueType.Identifier
                    ) {
                        const register = tmpSymbols.allocateTmp(irCode.left.name);
                        asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                        asm.push(`    cmpq ${irCode.right.offset}(%rbp), ${register}`);
                    }
                    if (
                        irCode.left.type === ValueType.Identifier
                        && irCode.right.type === ValueType.Imm
                    ) {
                        const register = tmpSymbols.allocateTmp(irCode.left.name);
                        asm.push(`    movq ${irCode.left.offset}(%rbp), ${register}`);
                        asm.push(`    cmpq $${irCode.right.value}, ${register}`);
                    }
                    if (
                        irCode.left.type === ValueType.Imm
                        && irCode.right.type === ValueType.Imm
                    ) {
                        const register = tmpSymbols.allocateTmp('');
                        asm.push(`    movq $${irCode.left.value}, ${register}`);
                        asm.push(`    cmpq $${irCode.right.value}, ${register}`);
                    }
                    if (
                        irCode.left.type === ValueType.Parameter
                        && irCode.right.type === ValueType.Imm
                    ) {
                        const register = tmpSymbols.allocateTmp('');
                        const leftPos = irCode.left.index >= 6
                            ? `${(irCode.left.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                        asm.push(`    movq ${leftPos}, ${register}`);
                        asm.push(`    cmpq $${irCode.right.value}, ${register}`);
                    }
                    if (
                        irCode.left.type === ValueType.Imm
                        && irCode.right.type === ValueType.Parameter
                    ) {
                        const register = tmpSymbols.allocateTmp('');
                        const rightPos = irCode.right.index >= 6
                            ? `${(irCode.right.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                        asm.push(`    movq $${irCode.left.value}, ${register}`);
                        asm.push(`    cmpq ${rightPos}, ${register}`);
                    }
                    if (
                        irCode.left.type === ValueType.Parameter
                        && irCode.right.type === ValueType.Parameter
                    ) {
                        const register = tmpSymbols.allocateTmp('');
                        const leftPos = irCode.left.index >= 6
                            ? `${(irCode.left.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                        const rightPos = irCode.right.index >= 6
                            ? `${(irCode.right.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                        asm.push(`    movq ${leftPos}, ${register}`);
                        asm.push(`    cmpq ${rightPos}, ${register}`);
                    }
                    switch (irCode.operator) {
                        case SyntaxKind.GreaterThanEqualsToken:
                        {
                            asm.push(`    jge ${irCode.targetLabel}`);
                            break;
                        }
                        case SyntaxKind.GreaterThanToken:
                        {
                            asm.push(`    jg ${irCode.targetLabel}`);
                            break;
                        }
                        case SyntaxKind.LessThanEqualsToken:
                        {
                            asm.push(`    jle ${irCode.targetLabel}`);
                            break;
                        }
                        case SyntaxKind.LessThanToken:
                        {
                            asm.push(`    jl ${irCode.targetLabel}`);
                            break;
                        }
                        case SyntaxKind.EqualsEqualsToken:
                        {
                            asm.push(`    je ${irCode.targetLabel}`);
                            break;
                        }
                        case SyntaxKind.ExclamationEqualsToken:
                        {
                            asm.push(`    jne ${irCode.targetLabel}`);
                            break;
                        }
                    }
                    asm.push('');
                    break;
                }
                case IRCodeType.arrayLocation:
                {
                    const {location, result} = irCode;
                    const register = tmpSymbols.allocateTmp(result.name);
                    const offset = location.offset;
                    const indexPos = (() => {
                        switch (location.index.type) {
                            case ValueType.Imm:
                                throw new Error('todo');
                            case ValueType.Tmp:
                            {
                                return tmpSymbols.getTmpRegister(location.index.name);
                            }
                            case ValueType.Identifier:
                            {
                                // @todo 用 r14 存 index
                                const register = '%r14';
                                asm.push(`    movq ${location.index.offset}(%rbp), ${register}`);
                                return register;
                            }
                            case ValueType.Parameter:
                                throw new Error('todo');
                        }
                    })();
                    const pos = offset === 200
                        ? `${location.name}(,${indexPos}, ${location.typeSize})`
                        : 'todo';
                    asm.push(`    movq ${pos}, ${register}`);
                    asm.push('');
                    break;
                }
            }
        }
    });

    ir.globals.forEach(item => {
        asm.push(`.comm ${item.name}, 8, ${item.size}`);
    });

    return asm.join('\n');
}
