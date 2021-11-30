/**
 * @file symbol table
 * @description Symbol table for the interpreter
 */

import {DeclarationNode, Type} from '../types/grammar';

interface IdentifierSymbol {
    name: string;
    type: Type;
    declaration: DeclarationNode;
}

interface Scope {
    kind: 'global' | 'block';
    symbols: Map<string, IdentifierSymbol>;
}

export class SymbolTable {

    private readonly stack: Scope[] = [];
    private currentScope: Scope | null = null;

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

    addSymbol(symbol: IdentifierSymbol) {
        const scope = this.stack[this.stack.length - 1];
        scope.symbols.set(symbol.name, symbol);
    }
}
