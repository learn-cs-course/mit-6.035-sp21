/**
 * @file 打印 ir code，调试用
 */

import {BinaryOperator, IRCodeType, UnaryOperator, SyntaxKind} from '../types/grammar';
import {ProgramIR, MethodIR, IRCode, ValueType, ValueKind} from './irCode';

export function printIR(ir: ProgramIR): string {
    const lines: string[] = [];
    ir.methods.forEach(method => {
        printMethod(method);
    });

    return lines.join('\n');

    function printMethod(method: MethodIR): void {
        lines.push(`method ${method.name}`);
        lines.push('');
        if (method.parameters.size > 0) {
            lines.push('    parameters:');
            method.parameters.forEach(parameter => {
                lines.push(`    ${parameter.name}`);
            });
            lines.push('');
        }
        if (method.codes.length > 0) {
            lines.push('    body:');
            method.codes.forEach(code => {
                lines.push(printCode(code));
            });
            lines.push('');
        }
    }
}

export function printCode(code: IRCode): string {
    switch (code.type) {
        case IRCodeType.enter:
            return '    enter';
        case IRCodeType.exit:
            return '    exit';
        case IRCodeType.return:
            if (code.value) {
                return `    return ${printValue(code.value)}`;
            }
            else {
                return '    return';
            }
        case IRCodeType.label:
            return `    label ${code.label}`;
        case IRCodeType.assign:
            return `    ${printValue(code.left)} = ${printValue(code.right)}`;
        case IRCodeType.call:
        {
            const argsCode = code.args.map(arg => printValue(arg)).join(', ');
            if (code.needReturnValue) {
                return `    @returnValue = call ${code.name}(${argsCode})`;
            }
            else {
                return `    call ${code.name}(${argsCode})`;
            }
        }
        case IRCodeType.unary:
            return `    ${printValue(code.result)} = ${printOperator(code.operator)} ${printValue(code.operand)}`;
        case IRCodeType.binary:
            return `    ${printValue(code.result)} = ${printValue(code.left)} `
                + `${printOperator(code.operator)} ${printValue(code.right)}`;
        case IRCodeType.conditionalJump:
            return `    if ${printValue(code.left)} ${printOperator(code.operator)} ${printValue(code.right)} `
                + `goto ${code.targetLabel}`;
        case IRCodeType.jump:
            return `    jump ${code.targetLabel}`;
        case IRCodeType.arrayLocation:
            return `    ${printValue(code.result)} = ${printValue(code.location)}]`;
        case IRCodeType.functionReturnCheck:
            return '    functionReturnCheck';
    }
}

function printValue(value: ValueType): string {
    switch (value.kind) {
        case ValueKind.String:
            return `${value.value}`;
        case ValueKind.Literal:
            return `${value.type} ${value.value}`;
        case ValueKind.Identifier:
            return `${value.symbol.type} ${value.symbol.name}`;
        case ValueKind.ArrayLocation:
            return `${value.symbol.name}[${printValue(value.index)}]`;
    }
}

function printOperator(operator: UnaryOperator | BinaryOperator): string {
    switch (operator) {
        case SyntaxKind.MinusToken:
            return '-';
        case SyntaxKind.ExclamationToken:
            return '!';
        case SyntaxKind.PlusToken:
            return '+';
        case SyntaxKind.AsteriskToken:
            return '*';
        case SyntaxKind.SlashToken:
            return '/';
        case SyntaxKind.PercentToken:
            return '%';
        case SyntaxKind.AmpersandAmpersandToken:
            return '&&';
        case SyntaxKind.BarBarToken:
            return '||';
        case SyntaxKind.EqualsEqualsToken:
            return '==';
        case SyntaxKind.ExclamationEqualsToken:
            return '!=';
        case SyntaxKind.LessThanToken:
            return '<';
        case SyntaxKind.LessThanEqualsToken:
            return '<=';
        case SyntaxKind.GreaterThanToken:
            return '>';
        case SyntaxKind.GreaterThanEqualsToken:
            return '>=';
    }
}
