/**
 * @file 语义检查规则的注册中心
 */

import {BaseNode} from '../types/grammar';
import {RuleObject, Rule} from './ruleType';
import {SymbolTable} from './symbolTable';
import noRedeclare from './rules/noRedeclare';
import noUseBeforeDefine from './rules/noUseBeforeDefine';
import noInvalidMainMethod from './rules/noInvalidMainMethod';
import noBadArraySize from './rules/noBadArraySize';
import noArgumentMismatch from './rules/noArgumentMismatch';
import returnValueMissmatich from './rules/returnValueMissmatich';
import noInvalidArrayIndex from './rules/noInvalidArrayIndex';
import noInvalidAssign from './rules/noInvalidAssign';
import noInvalidConditional from './rules/noInvalidConditional';
import noInvalidContinueAndBreak from './rules/noInvalidContinueAndBreak';

const registedRules: RuleObject[] = [
    noRedeclare,
    noUseBeforeDefine,
    noInvalidMainMethod,
    noBadArraySize,
    noArgumentMismatch,
    returnValueMissmatich,
    noInvalidArrayIndex,
    noInvalidAssign,
    noInvalidConditional,
    noInvalidContinueAndBreak,
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
