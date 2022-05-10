import {ProgramIR} from '../irCode';
import {buildControlFlowGraph, printControlFlowGraph} from './buildControlFlowGraph';
import {globalCommonExpressionElimination, localValueNumbering} from './cse';

export function optimizeIR(ir: ProgramIR): ProgramIR {
    const methods = ir.methods;
    const cfgs = methods.map(method => {
        const controlFlowGraph = buildControlFlowGraph(method);
        console.log('Before:', printControlFlowGraph(controlFlowGraph));
        controlFlowGraph.nodes.forEach(basicBlock => {
            localValueNumbering(basicBlock);
        });
        globalCommonExpressionElimination(controlFlowGraph);
        console.log('After:', printControlFlowGraph(controlFlowGraph));
        return controlFlowGraph;
    });
    cfgs;
    return ir;
}
