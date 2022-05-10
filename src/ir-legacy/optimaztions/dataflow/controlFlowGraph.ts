/**
 * @file 构造控制流图
 */

import {IRCodeType} from '../../../types/grammar';
import {IRPlainCode} from '../../ProgramIR';

interface BasicBlock {
    id: string;
    codes: IRPlainCode[];
}

interface Edge {
    source: string;
    target: string;
}

interface ControlFlowGraph {
    nodes: Map<string, BasicBlock>;
    edges: Edge[];
}

export function buildControlFlowGraph(codes: IRPlainCode[]): ControlFlowGraph {
    const graph: ControlFlowGraph = {
        nodes: new Map(),
        edges: [],
    };

    let currentBasicBlock: BasicBlock = {
        id: 'enter',
        codes: [],
    };

    graph.nodes.set(currentBasicBlock.id, currentBasicBlock);

    let nodeId = 0;

    for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        switch (code.type) {
            case IRCodeType.conditionalJump:
            {
                currentBasicBlock.codes.push(code);
                graph.edges.push({
                    source: currentBasicBlock.id,
                    target: code.targetLabel,
                });
                // 如果后面没有代码了，就不想着生成 node id 了
                if (i === codes.length - 1) {
                    break;
                }
                const nextCode = codes[i + 1];
                // 如果下一个是 label，就用 label 当 node id
                // 如果下一个不是 label，就生成一个 node id
                const newBasicBlock: BasicBlock = {
                    id: nextCode.type === IRCodeType.label ? nextCode.label : `Node${++nodeId}`,
                    codes: [],
                };
                // 对于 conditional jump，生成一条指向下一个 basic block 的边
                graph.edges.push({
                    source: currentBasicBlock.id,
                    target: newBasicBlock.id,
                });
                currentBasicBlock = newBasicBlock;
                graph.nodes.set(currentBasicBlock.id, currentBasicBlock);
                break;
            }
            case IRCodeType.jump:
            {
                currentBasicBlock.codes.push(code);
                graph.edges.push({
                    source: currentBasicBlock.id,
                    target: code.targetLabel,
                });
                // 如果后面没有代码了，就不想着生成 node id 了
                if (i === codes.length - 1) {
                    break;
                }
                const nextCode = codes[i + 1];
                // 如果下一个是 label，就用 label 当 node id
                // 如果下一个不是 label，就生成一个 node id
                const newBasicBlock: BasicBlock = {
                    id: nextCode.type === IRCodeType.label ? nextCode.label : `Node${++nodeId}`,
                    codes: [],
                };
                // 对于无条件跳转，不生成边
                currentBasicBlock = newBasicBlock;
                graph.nodes.set(currentBasicBlock.id, currentBasicBlock);
                break;
            }
            case IRCodeType.label:
            {
                if (currentBasicBlock.id !== code.label) {
                    const newBasicBlock: BasicBlock = {
                        id: code.label,
                        codes: [],
                    };
                    graph.edges.push({
                        source: currentBasicBlock.id,
                        target: newBasicBlock.id,
                    });
                    currentBasicBlock = newBasicBlock;
                    graph.nodes.set(currentBasicBlock.id, currentBasicBlock);
                }
                currentBasicBlock.codes.push(code);
                break;
            }
            default:
            {
                currentBasicBlock.codes.push(code);
                break;
            }
        }
    }

    return graph;
}

export function printIRCode(codes: IRPlainCode[]) {
    const lines: string[] = [];
    for (const code of codes) {
        lines.push(JSON.stringify(code));
    }
    return lines;
}

export function printControlFlowGraph(graph: ControlFlowGraph) {
    const lines: string[] = [
        'digraph G {',
    ];

    graph.nodes.forEach((basicBlock, id) => {
        const content = JSON.stringify(basicBlock.codes).replaceAll('"', '');
        const printedId = id.replaceAll('.', '');
        lines.push(`${printedId} [shape=box, xlabel="${id}"];`);
    });

    graph.edges.forEach(edge => {
        const source = edge.source.replaceAll('.', '');
        const target = edge.target.replaceAll('.', '');
        lines.push(`${source} -> ${target}`);
    });

    lines.push('}');

    return lines.join('\n');
}
