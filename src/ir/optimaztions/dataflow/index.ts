/**
 * @file 数据流分析
 */

import {ProgramIR} from '../../ProgramIR';
import {buildControlFlowGraph} from './controlFlowGraph';

export function dataFlowOptimaze(ir: ProgramIR): ProgramIR {
    const {methods} = ir;

    methods.forEach(method => {
        buildControlFlowGraph(method.codes);
    });

    return ir;
}
