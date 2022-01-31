/**
 * @file symbol table
 * @description Symbol table for the IR, with tmp variables
 */

interface LocalSymbol {
    kind: 'local';
    name: string;
    size: number;
    offset: number;
}

interface ParameterSymbol {
    kind: 'parameter';
    name: string;
    index: number;
}

interface GlobalSymbol {
    kind: 'global';
    name: string;
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

    // 当前 tmp var 的 id，这个不需要重置，只要不同就行了
    private currentTmpId: number = 0;

    // 变量分配内存位置的偏移量
    // @todo，嵌套作用域处理
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

    addGlobal(name: string) {
        const scope = this.stack[this.stack.length - 1];
        scope.symbols.set(name, {
            kind: 'global',
            name,
        });
    }

    /**
     * 在 symbol table 中添加一个变量
     * 由于需要计算 offset，因此需要知道变量占用多少 byte
     *
     * @param symbol
     * @param size
     */
    addLocal(name: string, size: number) {
        const scope = this.stack[this.stack.length - 1];
        const localSymbol: LocalSymbol = {
            kind: 'local',
            name,
            size,
            offset: this.currentOffset - size,
        };

        this.currentOffset = localSymbol.offset;

        // @todo 内存分配先简单粗暴一些，不考虑 bool 的插入
        const alignDelta = this.currentOffset % 8;
        if (!Object.is(alignDelta, -0)) {
            this.currentOffset = this.currentOffset - (8 + alignDelta);
        }

        scope.symbols.set(localSymbol.name, localSymbol);
    }

    addTmpVariable(): string {
        const scope = this.stack[this.stack.length - 1];
        const name = `@tmp${++this.currentTmpId}`;
        const tmpSymbol: TmpSymbol = {
            kind: 'tmp',
            name,
        };
        scope.symbols.set(tmpSymbol.name, tmpSymbol);
        return name;
    }

    addParameterSymbol(name: string, index: number) {
        const scope = this.stack[this.stack.length - 1];
        const parameterSymbol: ParameterSymbol = {
            kind: 'parameter',
            name,
            index,
        };
        scope.symbols.set(parameterSymbol.name, parameterSymbol);
    }
}
