import {StringConstantsPool} from './StringConstantsPool';
import {FieldSymbol} from './createFieldSymbol';
import {
    EnterIRCode,
    ReturnIRCode,
    ExitIRCode,
    CallIRCode,
    ArgumentIRCode,
    AssignIRCode,
    UnaryIRCode,
    BinaryIRCode,
    LabelIRCode,
    ConditionalJumpIRCode,
    JumpIRCode,
    ArrayLocationIRCode,
    FunctionReturnCheckIRCode,
} from './irCode';

export interface ParameterInMethod {
    size: number;
    offset: number;
}

type IRPlainCode = EnterIRCode
    | ReturnIRCode
    | ExitIRCode
    | CallIRCode
    | ArgumentIRCode
    | AssignIRCode
    | UnaryIRCode
    | BinaryIRCode
    | LabelIRCode
    | ConditionalJumpIRCode
    | JumpIRCode
    | ArrayLocationIRCode
    | FunctionReturnCheckIRCode;

export interface Method {
    name: string;
    parameters: Map<string, ParameterInMethod>;
    codes: IRPlainCode[];
    localSize: number;
    enableReturnCheck: boolean;
}

export interface ProgramIR {
    globals: FieldSymbol[];
    constants: StringConstantsPool;
    methods: Method[];
    enableArrayBoundCheck: boolean;
    enableReturnCheck: boolean;
}
