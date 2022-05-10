import {
    VariableDeclarationNode,
    SyntaxKind,
    Type, IRCodeType, BinaryOperator,
    UnaryOperator,
} from '../types/grammar';

export class JumpLabels {
    private labelId = 0;

    getLabel() {
        return `Label${this.labelId++}`;
    }
}

/**
 * 局部变量，包括临时生成的局部变量
 */
export interface LocalSymbol {
    kind: 'local';
    /**
     * 局部变量的名称，格式统一改为 var_{id}_{name}
     * 由于包含中间结果暂存的情况，此时 name 为空
     * 如果 name 为空，则为 @var_{id}
     * 这里的 @ 用来保证不与其他的任何标识符冲突
     */
    name: string;
    type: 'int' | 'bool';
    isArray: boolean;
    /**
     * 数组元素长度，对于 isArray 为 false 的情况，length 值为 -1
     */
    length: number;
}

export interface ParameterSymbol {
    kind: 'parameter';
    /**
     * 参数的名称，格式统一改为 param_{id}_{name}
     */
    name: string;
    type: 'int' | 'bool';
    /**
     * 第几个参数
     */
    index: number;
}

interface GlobalSymbol {
    kind: 'global';
    /**
     * 全局变量的名称，格式统一改为 global_{id}_{name}
     */
    name: string;
    type: 'int' | 'bool';
    isArray: boolean;
    /**
     * 数组元素长度，对于 isArray 为 false 的情况，length 值为 -1
     */
    length: number;
}

type ScopeSymbol = GlobalSymbol | LocalSymbol | ParameterSymbol;

interface Scope {
    kind: 'global' | 'block';
    symbols: Map<string, ScopeSymbol>;
}

export class SymbolTable {

    private readonly stack: Scope[] = [];
    private currentScope: Scope | null = null;

    // symbol name 中包含的自增 id
    private currentId: number = 0;

    getCurrentScope() {
        return this.currentScope;
    }

    enterScope(type: 'global' | 'block'): void {
        this.currentScope = {
            kind: type,
            symbols: new Map(),
        };
        this.stack.push(this.currentScope);
    }

    exitScope() {
        this.stack.pop();
        this.currentScope = this.stack[this.stack.length - 1];
    }

    findInCurrent(name: string) {
        if (this.currentScope === null) {
            return undefined;
        }
        return this.currentScope.symbols.get(name);
    }

    find(name: string) {
        for (let i = this.stack.length - 1; i >= 0; i--) {
            const scope = this.stack[i];
            if (scope.symbols.has(name)) {
                return scope.symbols.get(name);
            }
        }
        return undefined;
    }

    /**
     * 在作用域中添加全局变量
     *
     * @param name
     * @param type
     * @param isArray
     * @param length
     */
    addGlobal(name: string, type: 'int' | 'bool', isArray: boolean, length: number): GlobalSymbol {
        const scope = this.stack[this.stack.length - 1];
        const globalSymbol: GlobalSymbol = {
            kind: 'global',
            name: `global_${++this.currentId}_${name}`,
            type,
            isArray,
            length: isArray ? length : -1,
        };
        // 这里的 key 还是用之前的 name
        scope.symbols.set(name, globalSymbol);
        return globalSymbol;
    }

    addLocal(name: string, type: 'int' | 'bool', isArray: boolean, length: number): LocalSymbol {
        const scope = this.stack[this.stack.length - 1];
        const localSymbol: LocalSymbol = {
            kind: 'local',
            name: `var_${++this.currentId}_${name}`,
            type,
            isArray,
            length: isArray ? length : -1,
        };
        // 同上，这里的 key 还是用之前的 name，不然没法 find 了
        scope.symbols.set(name, localSymbol);
        return localSymbol;
    }

    addLocalTmp(type: 'int' | 'bool'): LocalSymbol {
        const scope = this.stack[this.stack.length - 1];
        const name = `@var_${++this.currentId}`;
        const localSymbol: LocalSymbol = {
            kind: 'local',
            name,
            type,
            isArray: false,
            length: -1,
        };
        // 这个东西不担心 find，本就是我们临时创建的
        scope.symbols.set(name, localSymbol);
        return localSymbol;
    }

    addParameterSymbol(name: string, type: 'int' | 'bool', index: number): ParameterSymbol {
        const scope = this.stack[this.stack.length - 1];
        const parameterSymbol: ParameterSymbol = {
            kind: 'parameter',
            name: `param_${++this.currentId}_${name}`,
            type,
            index,
        };
        scope.symbols.set(name, parameterSymbol);
        return parameterSymbol;
    }
}

/**
 * 用来承载 declaration 转换到 symbol 的中间产物
 */
interface BaseSymbol {
    name: string;
    type: 'int' | 'bool';
    isArray: boolean;
    length: number;
}

export function getSymbolFromDeclaration(node: VariableDeclarationNode): BaseSymbol {
    if (node.kind === SyntaxKind.Identifier) {
        return {
            name: node.name,
            type: node.nodeType === Type.Bool ? 'bool' : 'int',
            isArray: false,
            length: -1,
        };
    }
    const radix = node.size.value.startsWith('0x') ? 16 : 10;
    const length = parseInt(node.size.value, radix);
    return {
        name: node.name.name,
        type: node.nodeType === Type.BoolArray ? 'bool' : 'int',
        isArray: true,
        length,
    };
}

export const enum ValueKind {
    // 字符串字面量，因为走 label 所以单独一个类型
    String = 'String',
    // 字面量，包括 int 和 bool
    Literal = 'Literal',
    // 标识符，非数组
    Identifier = 'Identifier',
    // 数组元素
    ArrayLocation = 'ArrayLocation'
}

export interface StringValue {
    kind: ValueKind.String;
    value: string;
}

export interface LiteralValue {
    kind: ValueKind.Literal;
    type: 'int' | 'bool';
    value: number;
}

export interface IdentifierValue {
    kind: ValueKind.Identifier;
    symbol: ScopeSymbol;
}

export interface ArrayLocationValue {
    kind: ValueKind.ArrayLocation;
    symbol: ScopeSymbol;
    index: LiteralValue | IdentifierValue;
    enableArrayBoundCheck: boolean;
}

export type ValueType = StringValue | LiteralValue | IdentifierValue | ArrayLocationValue;

interface EnterIRCode {
    type: IRCodeType.enter;
}

interface ExitIRCode {
    type: IRCodeType.exit;
}

interface ReturnIRCode {
    type: IRCodeType.return;
    value?: IdentifierValue | LiteralValue;
}

export interface LabelIRCode {
    type: IRCodeType.label;
    label: string;
}

export interface AssignIRCode {
    type: IRCodeType.assign;
    left: IdentifierValue | ArrayLocationValue;
    right: LiteralValue | IdentifierValue;
}

interface CallIRCode {
    type: IRCodeType.call;
    name: string;
    args: Array<LiteralValue | IdentifierValue | StringValue>;
    needReturnValue: boolean;
}

interface UnaryIRCode {
    type: IRCodeType.unary;
    operator: UnaryOperator;
    result: IdentifierValue;
    operand: LiteralValue | IdentifierValue;
}

interface BinaryIRCode {
    type: IRCodeType.binary;
    operator: BinaryOperator;
    result: IdentifierValue;
    left: LiteralValue | IdentifierValue;
    right: LiteralValue | IdentifierValue;
}

interface ConditionalJumpIRCode {
    type: IRCodeType.conditionalJump;
    operator: BinaryOperator;
    left: LiteralValue | IdentifierValue;
    right: LiteralValue | IdentifierValue;
    targetLabel: string;
}

interface JumpIRCode {
    type: IRCodeType.jump;
    targetLabel: string;
}

interface ArrayLocationIRCode {
    type: IRCodeType.arrayLocation;
    location: ArrayLocationValue;
    result: IdentifierValue;
}

interface FunctionReturnCheckIRCode {
    type: IRCodeType.functionReturnCheck;
}

export type IRCode = EnterIRCode | ExitIRCode | ReturnIRCode | LabelIRCode | AssignIRCode |
    CallIRCode | UnaryIRCode | BinaryIRCode | ConditionalJumpIRCode | JumpIRCode |
    ArrayLocationIRCode | FunctionReturnCheckIRCode;

export interface MethodIR {
    name: string;
    parameters: Map<string, ParameterSymbol>;
    codes: IRCode[];
    enableReturnCheck: boolean;
}

export interface ProgramIR {
    globals: GlobalSymbol[];
    methods: MethodIR[];
    enableArrayBoundCheck: boolean;
    enableReturnCheck: boolean;
}
