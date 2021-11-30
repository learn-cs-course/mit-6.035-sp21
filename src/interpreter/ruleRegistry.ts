/**
 * @file 语义检查规则的注册中心
 */

import {BaseNode} from '../types/grammar';
import {RuleObject, Rule} from './ruleType';
import {SymbolTable} from './symbolTable';
import noRedeclare from './rules/noRedeclare';

const registedRules: RuleObject[] = [
    noRedeclare,
];

export class RuleRegistry {
    private readonly rules: Rule[] = registedRules.map(({create}) => {
        return create({
            symbolTable: this.symbolTable,
            report: this.report,
        });
    });

    constructor(
        private readonly symbolTable: SymbolTable
    ) {
    }

    emit(node: BaseNode, state: 'enter' | 'exit') {
        this.rules.forEach(rule => {
            const suffix = state === 'enter' ? '' : ':exit';
            const nodeTraverseEvent = `${node.kind}${suffix}` as keyof Rule;
            const ruleHandler = rule[nodeTraverseEvent];
            if (!ruleHandler) {
                return;
            }
            // @ts-expect-error
            ruleHandler(node);
        });
    }

    report(message: string) {
        throw new Error(message);
    }
}
