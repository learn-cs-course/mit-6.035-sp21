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
        const codesWithoutRedundant = codes.filter((code, index, codes) => {
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
        // 第三步，根据 map 执行 label 替换
        }).map(code => {
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
        // 第四步，如果 jump 后面的 target 是紧跟的下一个 label，那么这个 jump 是不需要的
        }).filter((code, index, codes) => {
            if (code.type !== IRCodeType.jump) {
                return true;
            }
            if (index + 1 === codes.length) {
                return true;
            }
            const nextCode = codes[index + 1];
            if (nextCode.type !== IRCodeType.label) {
                return true;
            }
            if (nextCode.label === code.targetLabel) {
                return false;
            }
            return true;
        });

        // 构造一个 Set，把所有有 jump 指的 label 都存下来
        const jumpTargetLabelSet = new Set<string>();

        codesWithoutRedundant.forEach(code => {
            switch (code.type) {
                case IRCodeType.jump:
                case IRCodeType.conditionalJump:
                {
                    const {targetLabel} = code;
                    jumpTargetLabelSet.add(targetLabel);
                }
            }
        });

        // 第五步，把所有没有 jump target 指向的 label 都过滤掉
        method.codes = codesWithoutRedundant.filter(code => {
            if (code.type !== IRCodeType.label) {
                return true;
            }
            return jumpTargetLabelSet.has(code.label);
        });
    }
    return ir;
}
