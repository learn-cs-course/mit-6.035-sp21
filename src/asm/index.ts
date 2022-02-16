/**
 * @file 汇编生成
 */

import {ProgramNode, IRCodeType, SyntaxKind} from '../types/grammar';
import {genIR} from '../ir';
import {ValueType, ArgumentIRCode, IdentifierValue} from '../ir/irCode';

class TmpSymbols {

    private readonly tmpMap = new Map<string, string>();

    // %rax，%rbx，%r10 都有特殊用途
    private registerUseRecord: Record<string, number> = {
        '%rdi': 0,
        '%rsi': 0,
        '%rcx': 0,
        '%rdx': 0,
        '%r8': 0,
        '%r9': 0,
        '%r11': 0,
        '%r12': 0,
        '%r13': 0,
        '%r14': 0,
        '%r15': 0,
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
        const register = this.tmpMap.get(name)!;
        return register;
    }

    replaceTmpName(before: string, after: string) {
        const register = this.tmpMap.get(before)!;
        this.tmpMap.delete(before);
        this.tmpMap.set(after, register);
        this.registerUseRecord[register] = Date.now();
    }

    freeRegister(register: string) {
        [...this.tmpMap.keys()].forEach(item => {
            if (this.tmpMap.get(item) === register) {
                this.tmpMap.delete(item);
            }
        });
        this.registerUseRecord[register] = 0;
    }

    private getEmptyRegister() {
        const register = Object.entries(this.registerUseRecord).sort((a, b) => {
            return a[1] - b[1];
        })[0][0];
        this.registerUseRecord[register] = performance.now();
        return register;
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

function getIdentifierValue(value: IdentifierValue) {
    if (value.offset === 200) {
        return value.name;
    }
    return `${value.offset}(%rbp)`;
}

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

    if (ir.enableArrayBoundCheck) {
        asm.push('.err_array_check_start:');
        asm.push('    .string "*** RUNTIME ERROR ***: Array out of Bounds access in method \\""');
        asm.push('.err_array_check_end:');
        asm.push('    .string "\\"\\n"');
        asm.push('');
    }

    if (ir.enableReturnCheck) {
        asm.push('.err_return_check_start:');
        asm.push('    .string "*** RUNTIME ERROR ***: No return value from non-void method \\""');
        asm.push('.err_return_check_end:');
        asm.push('    .string "\\"\\n"');
        asm.push('');
    }

    asm.push('.section .text');

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
                    asm.push('    pushq %r15');
                    asm.push('    pushq %r14');
                    asm.push('    pushq %r13');
                    asm.push('    pushq %r12');
                    asm.push('    pushq %rbx');
                    asm.push('    subq $8, %rsp');
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
                        tmpSymbols.freeRegister(register);
                    }
                    if (irCode.value.type === ValueType.Identifier) {
                        asm.push(`    movq ${getIdentifierValue(irCode.value)}, %rax`);
                    }
                    break;
                }
                case IRCodeType.exit:
                {
                    asm.push('    addq $8, %rsp');
                    asm.push('    popq %rbx');
                    asm.push('    popq %r12');
                    asm.push('    popq %r13');
                    asm.push('    popq %r14');
                    asm.push('    popq %r15');
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

                    asm.push('    pushq %r11');
                    asm.push('    pushq %r10');
                    asm.push('    pushq %r9');
                    asm.push('    pushq %r8');
                    asm.push('    pushq %rdx');
                    asm.push('    pushq %rcx');
                    asm.push('    pushq %rsi');
                    asm.push('    pushq %rdi');

                    if (callIRCode.length >= 6 && callIRCode.length % 2 !== 0) {
                        asm.push('    subq $8, %rsp');
                    }

                    while (stack.length > 0) {
                        const code = stack.pop()!;
                        if (stack.length >= 6) {
                            if (code.kind === SyntaxKind.StringLiteral) {
                                asm.push(`    pushq $${code.label}`);
                            }
                            else if (code.kind === ValueType.Identifier) {
                                asm.push(`    pushq ${getIdentifierValue(code.value)}`);
                            }
                            else if (code.kind === ValueType.Parameter) {
                                const pos = code.value.index >= 6
                                    ? `${(code.value.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(code.value.name)!.offset}(%rbp)`;
                                asm.push(`    pushq ${pos}`);
                            }
                            else if (code.kind === ValueType.Imm) {
                                asm.push(`    pushq $${code.value.value}`);
                            }
                            else if (code.kind === ValueType.Tmp) {
                                const register = tmpSymbols.getTmpRegister(code.value.name);
                                asm.push(`    pushq ${register}`);
                                tmpSymbols.freeRegister(register);
                            }
                            continue;
                        }
                        const register = CALLING_CONVENTION_REGISTERS[stack.length];
                        if (code.kind === SyntaxKind.StringLiteral) {
                            asm.push(`    movq $${code.label}, ${register}`);
                        }
                        else if (code.kind === ValueType.Identifier) {
                            asm.push(`    movq ${getIdentifierValue(code.value)}, ${register}`);
                        }
                        else if (code.kind === ValueType.Parameter) {
                            const pos = code.value.index >= 6
                                ? `${(code.value.index - 4) * 8}(%rbp)`
                                : `${method.parameters.get(code.value.name)!.offset}(%rbp)`;
                            asm.push(`    movq ${pos}, ${register}`);
                        }
                        else if (code.kind === ValueType.Imm) {
                            asm.push(`    movq $${code.value.value}, ${register}`);
                        }
                        else if (code.kind === ValueType.Tmp) {
                            const tmpRegister = tmpSymbols.getTmpRegister(code.value.name);
                            asm.push(`    movq ${tmpRegister}, ${register}`);
                            tmpSymbols.freeRegister(tmpRegister);
                        }
                        else {
                            // @todo
                        }
                    }

                    break;
                }
                case IRCodeType.call:
                {
                    // 兼容没有参数的情况
                    if (irCode.length === 0) {
                        asm.push('    pushq %r11');
                        asm.push('    pushq %r10');
                        asm.push('    pushq %r9');
                        asm.push('    pushq %r8');
                        asm.push('    pushq %rdx');
                        asm.push('    pushq %rcx');
                        asm.push('    pushq %rsi');
                        asm.push('    pushq %rdi');
                    }

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

                    asm.push('    popq %rdi');
                    asm.push('    popq %rsi');
                    asm.push('    popq %rcx');
                    asm.push('    popq %rdx');
                    asm.push('    popq %r8');
                    asm.push('    popq %r9');
                    asm.push('    popq %r10');
                    asm.push('    popq %r11');

                    asm.push('');
                    break;
                }
                case IRCodeType.assign:
                {
                    if (irCode.left.type === ValueType.Identifier) {
                        switch (irCode.right.type) {
                            case ValueType.Imm:
                            {
                                asm.push(`    movq $${irCode.right.value}, ${getIdentifierValue(irCode.left)}`);
                                break;
                            }
                            case ValueType.Tmp:
                            {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq ${register}, ${getIdentifierValue(irCode.left)}`);
                                tmpSymbols.freeRegister(register);
                                break;
                            }
                            case ValueType.Identifier:
                            {
                                const register = tmpSymbols.allocateTmp(irCode.right.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push(`    movq ${register}, ${getIdentifierValue(irCode.left)}`);
                                tmpSymbols.freeRegister(register);
                                break;
                            }
                            case ValueType.Parameter:
                            {
                                const register = tmpSymbols.allocateTmp(irCode.right.name);
                                const pos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${pos}, ${register}`);
                                asm.push(`    movq ${register}, ${getIdentifierValue(irCode.left)}`);
                                tmpSymbols.freeRegister(register);
                                break;
                            }
                        }
                    }
                    else if (irCode.left.type === ValueType.ArrayLocation) {
                        const offset = irCode.left.offset;
                        const indexPos = (() => {
                            switch (irCode.left.index.type) {
                                case ValueType.Imm:
                                {
                                    const register = '%rbx';
                                    asm.push(`    movq $${irCode.left.index.value}, ${register}`);
                                    return register;
                                }
                                case ValueType.Tmp:
                                {
                                    return tmpSymbols.getTmpRegister(irCode.left.index.name);
                                }
                                case ValueType.Identifier:
                                {
                                    const register = '%rbx';
                                    asm.push(`    movq ${getIdentifierValue(irCode.left.index)}, ${register}`);
                                    return register;
                                }
                                case ValueType.Parameter:
                                {
                                    const register = '%rbx';
                                    const pos = irCode.left.index.index >= 6
                                        ? `${(irCode.left.index.index - 4) * 8}(%rbp)`
                                        : `${method.parameters.get(irCode.left.index.name)!.offset}(%rbp)`;
                                    asm.push(`    movq ${pos}, ${register}`);
                                    return register;
                                }
                            }
                        })();
                        const pos = offset === 200
                            ? `${irCode.left.name}(,${indexPos}, ${irCode.left.typeSize})`
                            : `${irCode.left.offset}(%rbp, ${indexPos}, ${irCode.left.typeSize})`;

                        asm.push('    pushq %r15');
                        asm.push('    pushq %r14');
                        asm.push(`    movl $${irCode.left.methodNameLength}, %r14d`);
                        asm.push(`    movl $${irCode.left.methodName}, %r15d`);
                        asm.push(`    cmpq $0, ${indexPos}`);
                        asm.push('    jl .exit_array_check');
                        asm.push(`    cmpq $${irCode.left.length}, ${indexPos}`);
                        asm.push('    jge .exit_array_check');
                        asm.push('    popq %r14');
                        asm.push('    popq %r15');

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
                                tmpSymbols.freeRegister(register);
                                break;
                            }
                            case ValueType.Identifier:
                            {
                                const register = tmpSymbols.allocateTmp(irCode.right.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push(`    movq ${register}, ${pos}`);
                                tmpSymbols.freeRegister(register);
                                break;
                            }
                            case ValueType.Parameter:
                            {
                                const register = tmpSymbols.allocateTmp(irCode.right.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push(`    movq ${register}, ${pos}`);
                                tmpSymbols.freeRegister(register);
                                break;
                            }
                        }
                    }
                    else if (irCode.left.type === ValueType.Parameter) {
                        const leftPos = irCode.left.index >= 6
                            ? `${(irCode.left.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                        switch (irCode.right.type) {
                            case ValueType.Imm:
                            {
                                asm.push(`    movq $${irCode.right.value}, ${leftPos}`);
                                break;
                            }
                            case ValueType.Tmp:
                            {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq ${register}, ${leftPos}`);
                                tmpSymbols.freeRegister(register);
                                break;
                            }
                            case ValueType.Identifier:
                            {
                                const register = tmpSymbols.allocateTmp(irCode.right.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push(`    movq ${register}, ${leftPos}`);
                                break;
                            }
                            case ValueType.Parameter:
                            {
                                const register = tmpSymbols.allocateTmp(irCode.right.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push(`    movq ${register}, ${leftPos}`);
                                tmpSymbols.freeRegister(register);
                                break;
                            }
                        }
                    }
                    asm.push('');
                    break;
                }
                case IRCodeType.unary:
                {
                    switch (irCode.operator) {
                        case SyntaxKind.ExclamationToken:
                        {
                            if (irCode.operand.type === ValueType.Identifier) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    cmpq $0, ${getIdentifierValue(irCode.operand)}`);
                                asm.push('    sete %al');
                                asm.push('    movzbl %al, %eax');
                                asm.push(`    movq %rax, ${register}`);
                            }
                            else if (irCode.operand.type === ValueType.Tmp) {
                                const register = tmpSymbols.getTmpRegister(irCode.operand.name);
                                asm.push(`    cmpq $0, ${register}`);
                                asm.push('    sete %al');
                                asm.push('    movzbl %al, %eax');
                                asm.push(`    movq %rax, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.operand.name, irCode.result.name);
                            }
                            else if (irCode.operand.type === ValueType.Parameter) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const pos = irCode.operand.index >= 6
                                    ? `${(irCode.operand.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.operand.name)!.offset}(%rbp)`;
                                asm.push(`    cmpq $0, ${pos}`);
                                asm.push('    sete %al');
                                asm.push('    movzbl %al, %eax');
                                asm.push(`    movq %rax, ${register}`);
                            }
                            break;
                        }
                        case SyntaxKind.MinusToken:
                        {
                            if (irCode.operand.type === ValueType.Identifier) {
                                const resgiter = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.operand)}, ${resgiter}`);
                                asm.push(`    negq ${resgiter}`);
                            }
                            else if (irCode.operand.type === ValueType.Tmp) {
                                const register = tmpSymbols.getTmpRegister(irCode.operand.name);
                                asm.push(`    negq ${register}`);
                                tmpSymbols.replaceTmpName(irCode.operand.name, irCode.result.name);
                            }
                            else if (irCode.operand.type === ValueType.Parameter) {
                                const resgiter = tmpSymbols.allocateTmp(irCode.result.name);
                                const pos = irCode.operand.index >= 6
                                    ? `${(irCode.operand.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.operand.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${pos}, ${resgiter}`);
                                asm.push(`    negq ${resgiter}`);
                            }
                            break;
                        }
                        default:
                            throw new Error('unexpected');
                    }
                    break;
                }
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
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, ${register}`);
                                asm.push(`    addq ${getIdentifierValue(irCode.right)}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push(`    addq $${irCode.left.value}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, ${register}`);
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
                                asm.push(`    addq ${getIdentifierValue(irCode.right)}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    addq ${getIdentifierValue(irCode.left)}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    addq ${tmpSymbols.getTmpRegister(irCode.right.name)}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                tmpSymbols.freeRegister(tmpSymbols.getTmpRegister(irCode.right.name));
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
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq $${irCode.left.value}, ${register}`);
                                asm.push(`    addq ${rightPos}, ${register}`);
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
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    addq ${getIdentifierValue(irCode.right)}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, ${register}`);
                                asm.push(`    addq ${rightPos}, ${register}`);
                                break;
                            }
                            throw new Error('todo');
                        }
                        case SyntaxKind.MinusToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, ${register}`);
                                asm.push(`    subq ${getIdentifierValue(irCode.right)}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq $${irCode.left.value}, ${register}`);
                                asm.push(`    subq ${getIdentifierValue(irCode.right)}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, ${register}`);
                                asm.push(`    subq $${irCode.right.value}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq $${irCode.left.value}, %r10`);
                                asm.push(`    subq ${register}, %r10`);
                                asm.push(`    movq %r10, ${register}`);
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
                                asm.push(`    subq ${getIdentifierValue(irCode.right)}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, %r10`);
                                asm.push(`    subq ${register}, %r10`);
                                asm.push(`    movq %r10, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    subq ${tmpSymbols.getTmpRegister(irCode.right.name)}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                tmpSymbols.freeRegister(tmpSymbols.getTmpRegister(irCode.right.name));
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
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    subq ${tmpSymbols.getTmpRegister(irCode.right.name)}, ${register}`);
                                tmpSymbols.freeRegister(tmpSymbols.getTmpRegister(irCode.right.name));
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq $${irCode.left.value}, ${register}`);
                                asm.push(`    subq ${rightPos}, ${register}`);
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
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    subq ${getIdentifierValue(irCode.right)}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, ${register}`);
                                asm.push(`    subq ${rightPos}, ${register}`);
                                break;
                            }
                            throw new Error('todo');
                        }
                        case SyntaxKind.AsteriskToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, ${register}`);
                                asm.push(`    imulq ${getIdentifierValue(irCode.right)}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push(`    imulq $${irCode.left.value}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, ${register}`);
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
                                asm.push(`    imulq ${getIdentifierValue(irCode.right)}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                // 这里利用了交换律，需要注意
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    imulq ${getIdentifierValue(irCode.left)}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    imulq ${tmpSymbols.getTmpRegister(irCode.right.name)}, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                tmpSymbols.freeRegister(tmpSymbols.getTmpRegister(irCode.right.name));
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
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq $${irCode.left.value}, ${register}`);
                                asm.push(`    imulq ${rightPos}, ${register}`);
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
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, ${register}`);
                                asm.push(`    imulq ${getIdentifierValue(irCode.right)}, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, ${register}`);
                                asm.push(`    imulq ${rightPos}, ${register}`);
                                break;
                            }
                            throw new Error('todo');
                        }
                        case SyntaxKind.SlashToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, %rax`);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq $${irCode.left.value}, %rax`);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, %rax`);
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
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq $${irCode.left.value}, %rax`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    movq ${register}, %rax`);
                                asm.push(`    movq $${irCode.right.value}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    movq ${register}, %rax`);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, %rax`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq ${tmpSymbols.getTmpRegister(irCode.left.name)}, %rax`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                tmpSymbols.freeRegister(tmpSymbols.getTmpRegister(irCode.left.name));
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
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
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
                                asm.push(`    movq ${register}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq $${irCode.left.value}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
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
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push(`    movq $${irCode.right.value}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                const rightPos = getIdentifierValue(irCode.right);
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = getIdentifierValue(irCode.left);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rax, ${register}`);
                                break;
                            }
                            throw new Error('todo');
                        }
                        case SyntaxKind.PercentToken:
                        {
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, %rax`);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq $${irCode.left.value}, %rax`);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, %rax`);
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
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq $${irCode.left.value}, %rax`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Imm
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    movq ${register}, %rax`);
                                asm.push(`    movq $${irCode.right.value}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.left.name);
                                asm.push(`    movq ${register}, %rax`);
                                asm.push(`    movq ${getIdentifierValue(irCode.right)}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq ${getIdentifierValue(irCode.left)}, %rax`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Tmp
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                asm.push(`    movq ${tmpSymbols.getTmpRegister(irCode.left.name)}, %rax`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                tmpSymbols.freeRegister(tmpSymbols.getTmpRegister(irCode.left.name));
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
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
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
                                asm.push(`    movq ${register}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.left.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Tmp
                            ) {
                                const register = tmpSymbols.getTmpRegister(irCode.right.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                tmpSymbols.replaceTmpName(irCode.right.name, irCode.result.name);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Imm
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq $${irCode.left.value}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
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
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push(`    movq $${irCode.right.value}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Parameter
                                && irCode.right.type === ValueType.Identifier
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = irCode.left.index >= 6
                                    ? `${(irCode.left.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                                const rightPos = getIdentifierValue(irCode.right);
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                break;
                            }
                            if (
                                irCode.left.type === ValueType.Identifier
                                && irCode.right.type === ValueType.Parameter
                            ) {
                                const register = tmpSymbols.allocateTmp(irCode.result.name);
                                const leftPos = getIdentifierValue(irCode.left);
                                const rightPos = irCode.right.index >= 6
                                    ? `${(irCode.right.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${leftPos}, %rax`);
                                asm.push(`    movq ${rightPos}, ${register}`);
                                asm.push('    cqto');
                                asm.push(`    idivq ${register}`);
                                asm.push(`    movq %rdx, ${register}`);
                                break;
                            }
                            throw new Error('todo');
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
                        asm.push(`    movq ${getIdentifierValue(irCode.left)}, %r10`);
                        asm.push(`    cmpq ${getIdentifierValue(irCode.right)}, %r10`);
                    }
                    if (
                        irCode.left.type === ValueType.Identifier
                        && irCode.right.type === ValueType.Imm
                    ) {
                        asm.push(`    movq ${getIdentifierValue(irCode.left)}, %r10`);
                        asm.push(`    cmpq $${irCode.right.value}, %r10`);
                    }
                    if (
                        irCode.left.type === ValueType.Imm
                        && irCode.right.type === ValueType.Identifier
                    ) {
                        asm.push(`    movq $${irCode.left.value}, %r10`);
                        asm.push(`    cmpq ${getIdentifierValue(irCode.right)}, %r10`);
                    }
                    if (
                        irCode.left.type === ValueType.Imm
                        && irCode.right.type === ValueType.Imm
                    ) {
                        asm.push(`    movq $${irCode.left.value}, %r10`);
                        asm.push(`    cmpq $${irCode.right.value}, %r10`);
                    }
                    if (
                        irCode.left.type === ValueType.Parameter
                        && irCode.right.type === ValueType.Imm
                    ) {
                        const leftPos = irCode.left.index >= 6
                            ? `${(irCode.left.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                        asm.push(`    movq ${leftPos}, %r10`);
                        asm.push(`    cmpq $${irCode.right.value}, %r10`);
                    }
                    if (
                        irCode.left.type === ValueType.Imm
                        && irCode.right.type === ValueType.Parameter
                    ) {
                        const rightPos = irCode.right.index >= 6
                            ? `${(irCode.right.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                        asm.push(`    movq $${irCode.left.value}, %r10`);
                        asm.push(`    cmpq ${rightPos}, %r10`);
                    }
                    if (
                        irCode.left.type === ValueType.Parameter
                        && irCode.right.type === ValueType.Parameter
                    ) {
                        const leftPos = irCode.left.index >= 6
                            ? `${(irCode.left.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                        const rightPos = irCode.right.index >= 6
                            ? `${(irCode.right.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                        asm.push(`    movq ${leftPos}, %r10`);
                        asm.push(`    cmpq ${rightPos}, %r10`);
                    }
                    if (
                        irCode.left.type === ValueType.Tmp
                        && irCode.right.type === ValueType.Tmp
                    ) {
                        const leftRegister = tmpSymbols.getTmpRegister(irCode.left.name);
                        const rightRegister = tmpSymbols.getTmpRegister(irCode.right.name);
                        asm.push(`    cmpq ${rightRegister}, ${leftRegister}`);
                        tmpSymbols.freeRegister(leftRegister);
                        tmpSymbols.freeRegister(rightRegister);
                    }
                    if (
                        irCode.left.type === ValueType.Identifier
                        && irCode.right.type === ValueType.Tmp
                    ) {
                        const rightRegister = tmpSymbols.getTmpRegister(irCode.right.name);
                        asm.push(`    movq ${getIdentifierValue(irCode.left)}, %r10`);
                        asm.push(`    cmpq ${rightRegister}, %r10`);
                        tmpSymbols.freeRegister(rightRegister);
                    }
                    if (
                        irCode.left.type === ValueType.Tmp
                        && irCode.right.type === ValueType.Identifier
                    ) {
                        const leftRegister = tmpSymbols.getTmpRegister(irCode.left.name);
                        asm.push(`    cmpq ${getIdentifierValue(irCode.right)}, ${leftRegister}`);
                        tmpSymbols.freeRegister(leftRegister);
                    }
                    if (
                        irCode.left.type === ValueType.Tmp
                        && irCode.right.type === ValueType.Imm
                    ) {
                        const leftRegister = tmpSymbols.getTmpRegister(irCode.left.name);
                        asm.push(`    cmpq $${irCode.right.value}, ${leftRegister}`);
                        tmpSymbols.freeRegister(leftRegister);
                    }
                    if (
                        irCode.left.type === ValueType.Imm
                        && irCode.right.type === ValueType.Tmp
                    ) {
                        const rightRegister = tmpSymbols.getTmpRegister(irCode.right.name);
                        asm.push(`    movq $${irCode.left.value}, %r10`);
                        asm.push(`    cmpq ${rightRegister}, %r10`);
                        tmpSymbols.freeRegister(rightRegister);
                    }
                    if (
                        irCode.left.type === ValueType.Parameter
                        && irCode.right.type === ValueType.Identifier
                    ) {
                        const leftPos = irCode.left.index >= 6
                            ? `${(irCode.left.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                        asm.push(`    movq ${leftPos}, %r10`);
                        asm.push(`    cmpq ${getIdentifierValue(irCode.right)}, %r10`);
                    }
                    if (
                        irCode.left.type === ValueType.Identifier
                        && irCode.right.type === ValueType.Parameter
                    ) {
                        const rightPos = irCode.right.index >= 6
                            ? `${(irCode.right.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                        asm.push(`    movq ${getIdentifierValue(irCode.left)}, %r10`);
                        asm.push(`    cmpq ${rightPos}, %r10`);
                    }
                    if (
                        irCode.left.type === ValueType.Parameter
                        && irCode.right.type === ValueType.Tmp
                    ) {
                        const leftPos = irCode.left.index >= 6
                            ? `${(irCode.left.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.left.name)!.offset}(%rbp)`;
                        const rightRegister = tmpSymbols.getTmpRegister(irCode.right.name);
                        asm.push(`    movq ${leftPos}, %r10`);
                        asm.push(`    cmpq ${rightRegister}, %r10`);
                        tmpSymbols.freeRegister(rightRegister);
                    }
                    if (
                        irCode.left.type === ValueType.Tmp
                        && irCode.right.type === ValueType.Parameter
                    ) {
                        const rightPos = irCode.right.index >= 6
                            ? `${(irCode.right.index - 4) * 8}(%rbp)`
                            : `${method.parameters.get(irCode.right.name)!.offset}(%rbp)`;
                        const leftRegister = tmpSymbols.getTmpRegister(irCode.left.name);
                        asm.push(`    cmpq ${rightPos}, ${leftRegister}`);
                        tmpSymbols.freeRegister(leftRegister);
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
                            {
                                const register = '%rbx';
                                asm.push(`    movq $${location.index.value}, ${register}`);
                                return register;
                            }
                            case ValueType.Tmp:
                            {
                                return tmpSymbols.getTmpRegister(location.index.name);
                            }
                            case ValueType.Identifier:
                            {
                                const register = '%rbx';
                                asm.push(`    movq ${getIdentifierValue(location.index)}, ${register}`);
                                return register;
                            }
                            case ValueType.Parameter:
                            {
                                const register = '%rbx';
                                const pos = location.index.index >= 6
                                    ? `${(location.index.index - 4) * 8}(%rbp)`
                                    : `${method.parameters.get(location.index.name)!.offset}(%rbp)`;
                                asm.push(`    movq ${pos}, ${register}`);
                                return register;
                            }
                        }
                    })();

                    asm.push('    pushq %r15');
                    asm.push('    pushq %r14');
                    asm.push(`    movl $${location.methodNameLength}, %r14d`);
                    asm.push(`    movl $${location.methodName}, %r15d`);
                    asm.push(`    cmpq $0, ${indexPos}`);
                    asm.push('    jl .exit_array_check');
                    asm.push(`    cmpq $${location.length}, ${indexPos}`);
                    asm.push('    jge .exit_array_check');
                    asm.push('    popq %r14');
                    asm.push('    popq %r15');

                    const pos = offset === 200
                        ? `${location.name}(, ${indexPos}, ${location.typeSize})`
                        : `${location.offset}(%rbp, ${indexPos}, ${location.typeSize})`;
                    asm.push(`    movq ${pos}, ${register}`);
                    asm.push('');
                    break;
                }
                case IRCodeType.functionReturnCheck:
                {
                    asm.push(`    movl $${irCode.methodNameLength}, %r14d`);
                    asm.push(`    movl $${irCode.methodName}, %r15d`);
                    asm.push('    jmp .exit_return_check');
                    break;
                }
            }
        }
    });

    if (ir.enableArrayBoundCheck) {
        asm.push('.exit_array_check:');
        asm.push('    movl $61, %edx');
        asm.push('    movl $.err_array_check_start, %ecx');
        asm.push('    movl $2, %ebx');
        asm.push('    movl $4, %eax');
        asm.push('    int $0x80');
        asm.push('');
        asm.push('    movl %r14d, %edx');
        asm.push('    movl %r15d, %ecx');
        asm.push('    movl $2, %ebx');
        asm.push('    movl $4, %eax');
        asm.push('    int $0x80');
        asm.push('');
        asm.push('    movl $2, %edx');
        asm.push('    movl $.err_array_check_end, %ecx');
        asm.push('    movl $2, %ebx');
        asm.push('    movl $4, %eax');
        asm.push('    int $0x80');
        asm.push('');
        // 我本来想的是用下面的代码代替 exit(-1)，但是不行
        // 因为 printf 在重定向的时候，会全缓冲，不会实际 write 到 stdout
        // http://seanchense.github.io/2018/10/05/cache-policy-behind-printf-stdout/
        // 所以 nodejs execSync 调用的时候拿不到 stdout
        // asm.push('    movl $-1, %ebx');
        // asm.push('    movl $1, %eax');
        // asm.push('    int $0x80');
        // 所以我不掘强了，还是选择依赖 lib 里面的 exit 吧
        // exit 在调用过程中，会调用 fflush，将缓冲写入 stdout
        asm.push('    movq $-1, %rdi');
        asm.push('    call exit');
        asm.push('');
    }

    if (ir.enableReturnCheck) {
        asm.push('.exit_return_check:');
        asm.push('    movl $61, %edx');
        asm.push('    movl $.err_return_check_start, %ecx');
        asm.push('    movl $2, %ebx');
        asm.push('    movl $4, %eax');
        asm.push('    int $0x80');
        asm.push('');
        asm.push('    movl %r14d, %edx');
        asm.push('    movl %r15d, %ecx');
        asm.push('    movl $2, %ebx');
        asm.push('    movl $4, %eax');
        asm.push('    int $0x80');
        asm.push('');
        asm.push('    movl $2, %edx');
        asm.push('    movl $.err_return_check_end, %ecx');
        asm.push('    movl $2, %ebx');
        asm.push('    movl $4, %eax');
        asm.push('    int $0x80');
        asm.push('');
        asm.push('    movq $-2, %rdi');
        asm.push('    call exit');
        asm.push('');
    }

    ir.globals.forEach(item => {
        asm.push(`.comm ${item.name}, ${item.size}, 8`);
    });

    asm.push('');

    return asm.join('\n');
}
