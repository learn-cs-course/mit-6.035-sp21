import {IRCodeType} from '../../types/grammar';
import {IRCode, MethodIR} from '../irCode';
import {printCode} from '../printIR';

export interface BasicBlock {
    id: string;
    codes: IRCode[];
}

interface Edge {
    source: string;
    target: string;
}

export interface ControlFlowGraph {
    name: string;
    nodes: Map<string, BasicBlock>;
    edges: Edge[];
    predecessors: Map<string, Set<string>>;
    successors: Map<string, Set<string>>;
}

export function buildControlFlowGraph(method: MethodIR): ControlFlowGraph {
    const {codes} = method;
    const graph: ControlFlowGraph = {
        name: method.name,
        nodes: new Map(),
        edges: [],
        predecessors: new Map(),
        successors: new Map(),
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
            case IRCodeType.exit:
            {
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

    graph.nodes.forEach(node => {
        graph.predecessors.set(node.id, new Set());
        graph.successors.set(node.id, new Set());
    });

    graph.edges.forEach(({source, target}) => {
        graph.predecessors.get(target)!.add(source);
        graph.successors.get(source)!.add(target);
    });

    return graph;
}

/**
 * 打印控值流图为 dot 格式，通过 graphviz 可视化
 *
 * @ref https://dreampuf.github.io/GraphvizOnline/
 * @param graph
 * @returns
 */
export function printControlFlowGraph(graph: ControlFlowGraph) {
    const lines: string[] = [
        `digraph ${graph.name} {`,
    ];

    graph.nodes.forEach((basicBlock, id) => {
        const isExit = basicBlock.codes.findIndex(code => code.type === IRCodeType.exit);
        const content = printBasicBlock(basicBlock).map(line => {
            return line.replaceAll('\\n', '\\\\n');
        }).join('\\n').replaceAll('"', '\\"');
        lines.push(`    ${id} [shape=box, xlabel="${isExit === -1 ? id : 'exit'}" label="${content}"];`);
    });

    lines.push('');

    graph.edges.forEach(edge => {
        const {source, target} = edge;
        lines.push(`    ${source} -> ${target}`);
    });

    lines.push('}');
    lines.push('');

    return lines.join('\n');
}

function printBasicBlock(basicBlock: BasicBlock) {
    const lines: string[] = [];
    lines.push(`BasicBlock ${basicBlock.id}`);
    lines.push('');
    basicBlock.codes.forEach(code => {
        lines.push(printCode(code));
    });
    lines.push('');
    return lines;
}
