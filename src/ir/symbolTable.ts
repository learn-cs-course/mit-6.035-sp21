/**
 * @file symbol table
 * @description Symbol table for the IR, with tmp variables
 */

interface LocalSymbol {
    kind: 'local';
    name: string;
    typeSize: number;
    size: number;
    offset: number;
}

interface ParameterSymbol {
    kind: 'parameter';
    name: string;
    index: number;
    offset: number;
}

interface GlobalSymbol {
    kind: 'global';
    name: string;
    typeSize: number;
    size: number;
}

interface TmpSymbol {
    kind: 'tmp';
    name: string;
}

type ScopeSymbol = GlobalSymbol | LocalSymbol | TmpSymbol | ParameterSymbol;

interface Scope {
    kind: 'global' | 'block';
    symbols: Map<string, ScopeSymbol>;
}

export class SymbolTable {

    private readonly stack: Scope[] = [];
    private currentScope: Scope | null = null;

    // 当前 tmp var、stack var 的 id，这个不需要重置，只要不同就行了
    private currentId: number = 0;

    // 变量分配内存位置的偏移量
    private currentOffset: number = 0;

    getCurrentOffset() {
        return this.currentOffset;
    }

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
        // 退出到 global 后重置 offset
        if (this.currentScope && this.currentScope.kind === 'global') {
            this.currentOffset = 0;
        }
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

    addGlobal(name: string, typeSize: number, size: number) {
        const scope = this.stack[this.stack.length - 1];
        scope.symbols.set(name, {
            kind: 'global',
            name,
            typeSize,
            size,
        });
    }

    /**
     * 在 symbol table 中添加一个变量
     * 由于需要计算 offset，因此需要知道变量占用多少 byte
     *
     * @param symbol
     * @param typeSize
     * @param size
     */
    addLocal(name: string, typeSize: number, size: number) {
        const scope = this.stack[this.stack.length - 1];
        // @todo 把 bool 也当成 8 字节，目前不这么处理，参数传递会有问题
        const length = Math.floor(size / typeSize);
        const localSymbol: LocalSymbol = {
            kind: 'local',
            name,
            typeSize: 8,
            size: 8 * length,
            offset: this.currentOffset - 8 * length,
        };

        this.currentOffset = localSymbol.offset;

        // @todo 内存分配先简单粗暴一些，不考虑 bool 的插入
        const alignDelta = this.currentOffset % 8;
        if (!Object.is(alignDelta, -0)) {
            this.currentOffset = this.currentOffset - (8 + alignDelta);
        }

        scope.symbols.set(localSymbol.name, localSymbol);
        return localSymbol;
    }

    addStackVariable(): LocalSymbol {
        const scope = this.stack[this.stack.length - 1];
        const name = `@stack${++this.currentId}`;
        const localSymbol: LocalSymbol = {
            kind: 'local',
            name,
            typeSize: 8,
            size: 8,
            offset: this.currentOffset - 8,
        };

        this.currentOffset = localSymbol.offset;

        // @todo 内存分配先简单粗暴一些，不考虑 bool 的插入
        const alignDelta = this.currentOffset % 8;
        if (!Object.is(alignDelta, -0)) {
            this.currentOffset = this.currentOffset - (8 + alignDelta);
        }

        scope.symbols.set(localSymbol.name, localSymbol);
        return localSymbol;
    }

    addTmpVariable(): string {
        const scope = this.stack[this.stack.length - 1];
        const name = `@tmp${++this.currentId}`;
        const tmpSymbol: TmpSymbol = {
            kind: 'tmp',
            name,
        };
        scope.symbols.set(tmpSymbol.name, tmpSymbol);
        return name;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    addParameterSymbol(name: string, index: number, _size: number) {
        // @todo 把 bool 也当成 8 字节，目前不这么处理，参数传递会有问题
        const scope = this.stack[this.stack.length - 1];
        const parameterSymbol: ParameterSymbol = {
            kind: 'parameter',
            name,
            index,
            offset: index < 6 ? this.currentOffset - 8 : 0,
        };
        if (index < 6) {
            this.currentOffset = parameterSymbol.offset;
        }
        scope.symbols.set(parameterSymbol.name, parameterSymbol);
        return parameterSymbol.offset;
    }
}
