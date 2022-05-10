import {
    SyntaxKind,
    IRCodeType, BinaryOperator,
    UnaryOperator,
} from '../types/grammar';

export interface EnterIRCode {
    type: IRCodeType.enter;
}

export function createEnterIRCode(): EnterIRCode {
    return {type: IRCodeType.enter};
}

export interface ReturnIRCode {
    type: IRCodeType.return;
    value?: ImmValue | TmpValue | IdentifierValue | ParameterValue;
}

export function createReturnIRCode(value?: ImmValue | TmpValue | IdentifierValue): ReturnIRCode {
    return {
        type: IRCodeType.return,
        value,
    };
}

export interface ExitIRCode {
    type: IRCodeType.exit;
}

export function createExitIRCode(): ExitIRCode {
    return {type: IRCodeType.exit};
}

export interface CallIRCode {
    type: IRCodeType.call;
    name: string;
    length: number;
}

export function createCallIRCode(name: string, length: number): CallIRCode {
    return {
        type: IRCodeType.call,
        name,
        length,
    };
}

export const enum ValueType {
    // 立即数
    Imm,
    // 临时变量
    Tmp,
    // 标识符
    Identifier,
    // 数组元素
    ArrayLocation,
    // 函数参数
    Parameter
}

interface StringLiteralArgumentIRCode {
    type: IRCodeType.argument;
    kind: SyntaxKind.StringLiteral;
    label: string;
}

export interface IdentifierArgumentIRCode {
    type: IRCodeType.argument;
    kind: ValueType.Identifier;
    value: IdentifierValue;
}

interface LiteralArgumentIRCode {
    type: IRCodeType.argument;
    kind: ValueType.Imm;
    value: ImmValue;
}

interface TmpArgumentIRCode {
    type: IRCodeType.argument;
    kind: ValueType.Tmp;
    value: TmpValue;
}

interface ParameterArgumentIRCode {
    type: IRCodeType.argument;
    kind: ValueType.Parameter;
    value: ParameterValue;
}

export type ArgumentIRCode = StringLiteralArgumentIRCode |
    IdentifierArgumentIRCode | LiteralArgumentIRCode |
    TmpArgumentIRCode | ParameterArgumentIRCode;

export function createArgumentIRCode(
    value: string | AssignmentIRCodeRigntValue): ArgumentIRCode {
    if (typeof value === 'string') {
        return {
            type: IRCodeType.argument,
            kind: SyntaxKind.StringLiteral,
            label: value,
        };
    }

    return {
        type: IRCodeType.argument,
        kind: value.type,
        // @ts-expect-error
        value,
    };
}

export interface ImmValue {
    type: ValueType.Imm;
    value: number;
}

interface TmpValue {
    type: ValueType.Tmp;
    name: string;
}

export interface IdentifierValue {
    type: ValueType.Identifier;
    name: string;
    offset: number;
}

export interface ParameterValue {
    type: ValueType.Parameter;
    name: string;
    index: number;
}

export interface ArrayLocationValue {
    type: ValueType.ArrayLocation;
    name: string;
    index: ImmValue | TmpValue | IdentifierValue | ParameterValue;
    typeSize: number;
    length: number;
    methodName: string;
    methodNameLength: number;
    offset: number;
}

export type AssignmentIRCodeRigntValue = ImmValue | TmpValue | IdentifierValue | ParameterValue;

export interface AssignIRCode {
    type: IRCodeType.assign;
    left: IdentifierValue | ParameterValue | ArrayLocationValue;
    right: AssignmentIRCodeRigntValue;
}

export function createAssignIRCode(
    left: IdentifierValue | ParameterValue | ArrayLocationValue,
    right: AssignmentIRCodeRigntValue): AssignIRCode {
    return {
        type: IRCodeType.assign,
        left,
        right,
    };
}

export interface UnaryIRCode {
    type: IRCodeType.unary;
    operator: UnaryOperator;
    result: TmpValue;
    operand: TmpValue | ImmValue | IdentifierValue | ParameterValue;
}

export function createUnaryIRCode(
    operator: UnaryOperator,
    result: TmpValue,
    operand: TmpValue | ImmValue | IdentifierValue | ParameterValue): UnaryIRCode {
    return {
        type: IRCodeType.unary,
        operator,
        result,
        operand,
    };
}

export interface BinaryIRCode {
    type: IRCodeType.binary;
    operator: BinaryOperator;
    result: TmpValue;
    left: TmpValue | ImmValue | IdentifierValue | ParameterValue;
    right: TmpValue | ImmValue | IdentifierValue | ParameterValue;
}

export function createBinaryIRCode(
    operator: BinaryOperator,
    result: TmpValue,
    left: TmpValue | ImmValue | IdentifierValue | ParameterValue,
    right: TmpValue | ImmValue | IdentifierValue | ParameterValue): BinaryIRCode {
    return {
        type: IRCodeType.binary,
        operator,
        result,
        left,
        right,
    };
}

export interface LabelIRCode {
    type: IRCodeType.label;
    label: string;
}

export function createLabelIRCode(label: string): LabelIRCode {
    return {
        type: IRCodeType.label,
        label,
    };
}

export interface ConditionalJumpIRCode {
    type: IRCodeType.conditionalJump;
    operator: BinaryOperator;
    left: TmpValue | ImmValue | IdentifierValue | ParameterValue;
    right: TmpValue | ImmValue | IdentifierValue | ParameterValue;
    targetLabel: string;
}

export function createConditionalJumpIRCode(
    operator: BinaryOperator,
    left: TmpValue | ImmValue | IdentifierValue | ParameterValue,
    right: TmpValue | ImmValue | IdentifierValue | ParameterValue,
    targetLabel: string): ConditionalJumpIRCode {
    return {
        type: IRCodeType.conditionalJump,
        operator,
        left,
        right,
        targetLabel,
    };
}

export interface JumpIRCode {
    type: IRCodeType.jump;
    targetLabel: string;
}

export function createJumpIRCode(
    targetLabel: string): JumpIRCode {
    return {
        type: IRCodeType.jump,
        targetLabel,
    };
}

export interface ArrayLocationIRCode {
    type: IRCodeType.arrayLocation;
    location: ArrayLocationValue;
    result: TmpValue;
}

export function createArrayLocationIRCode(
    location: ArrayLocationValue,
    result: TmpValue): ArrayLocationIRCode {
    return {
        type: IRCodeType.arrayLocation,
        location,
        result,
    };
}

export interface FunctionReturnCheckIRCode {
    type: IRCodeType.functionReturnCheck;
    methodName: string;
    methodNameLength: number;
}

export function createFunctionReturnCheckIRCode(
    methodName: string,
    methodNameLength: number): FunctionReturnCheckIRCode {
    return {
        type: IRCodeType.functionReturnCheck,
        methodName,
        methodNameLength,
    };
}
