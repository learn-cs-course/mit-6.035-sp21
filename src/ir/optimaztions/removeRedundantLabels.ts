/**
 * @file 移除冗余标签，方便构造控制流图
 */

import {IRCodeType} from '../../types/grammar';
import {ProgramIR} from '../ProgramIR';

export function removeRedundantLabels(ir: ProgramIR): ProgramIR {
    const {methods} = ir;
    let labelIndex = 0;
    for (const method of methods) {
        const {codes} = method;

        // 第一步，相邻 label 合并到相同的 index
        let isLabelIndexUpdated = true;
        const labelMap = new Map<string, number>();
        for (const code of codes) {
            if (code.type !== IRCodeType.label) {
                if (!isLabelIndexUpdated) {
                    labelIndex++;
                    isLabelIndexUpdated = true;
                }
                continue;
            }
            labelMap.set(code.label, labelIndex);
            isLabelIndexUpdated = false;
        }

        // 第二步，在 IR 中移除相邻的 label
        const codesWithoutRedundant = codes.filter((code, index) => {
            if (index === 0) {
                return true;
            }
            const lastCode = codes[index - 1];
            if (
                lastCode.type === IRCodeType.label
                && code.type === IRCodeType.label
            ) {
                return false;
            }
            return true;
        });

        // 第三步，根据 map 执行 label 替换
        const codesRewrited = codesWithoutRedundant.map(code => {
            switch (code.type) {
                case IRCodeType.conditionalJump:
                case IRCodeType.jump:
                {
                    code.targetLabel = `.Label${labelMap.get(code.targetLabel)!}`;
                    return code;
                }
                case IRCodeType.label:
                {
                    code.label = `.Label${labelMap.get(code.label)!}`;
                    return code;
                }
                default:
                    return code;
            }
        });

        method.codes = codesRewrited;
    }
    return ir;
}
