export class StringConstantsPool {

    private readonly map = new Map<string, number>();

    get size() {
        return this.map.size;
    }

    getLabel(stringLiteral: string): string {
        if (this.map.has(stringLiteral)) {
            return `.msg${this.map.get(stringLiteral)}`;
        }
        this.map.set(stringLiteral, this.map.size);
        return `.msg${this.map.size - 1}`;
    }

    entries() {
        return this.map.entries();
    }
}
