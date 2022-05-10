/* eslint-disable @typescript-eslint/prefer-for-of */
import {BinaryOperator, IRCodeType} from '@/types/grammar';
import {IdentifierValue, LiteralValue, ValueKind, LocalSymbol, AssignIRCode} from '../irCode';
import {BasicBlock, ControlFlowGraph} from './buildControlFlowGraph';

/**
 * Do common subexpression elimination in single basic block
 *
 * @ref simple implementation from Ark Book 8.4.1
 * @param basicBlock
 */
export function localValueNumbering(basicBlock: BasicBlock) {
    const {codes} = basicBlock;
    let valueId = 0;
    const varToValue = new Map<string, number>();
    const expToValue = new Map<string, number>();
    const expToTmp = new Map<string, LocalSymbol>();
    for (let i = 0; i < codes.length; i++) {
        const code = codes[i];
        switch (code.type) {
            case IRCodeType.binary:
            {
                if (
                    code.left.kind === ValueKind.Identifier && code.left.symbol.kind === 'global'
                    || code.right.kind === ValueKind.Identifier && code.right.symbol.kind === 'global'
                ) {
                    continue;
                }
                const left = getOrInsertValueNumber(varStringify(code.left));
                const right = getOrInsertValueNumber(varStringify(code.right));
                const calcKey = `${code.operator} ${left} ${right}`;
                if (expToValue.has(calcKey)) {
                    const tmpSymbol = expToTmp.get(calcKey)!;
                    const newCode: AssignIRCode = {
                        type: IRCodeType.assign,
                        left: code.result,
                        right: {
                            kind: ValueKind.Identifier,
                            symbol: tmpSymbol,
                        },
                    };
                    varToValue.set(varStringify(code.result), expToValue.get(calcKey)!);
                    codes[i] = newCode;
                }
                else {
                    const newValueId = ++valueId;
                    expToValue.set(calcKey, newValueId);
                    expToTmp.set(calcKey, code.result.symbol as LocalSymbol);
                    varToValue.set(varStringify(code.result), newValueId);
                }
            }
        }
    }

    function getOrInsertValueNumber(key: string) {
        if (varToValue.has(key)) {
            return varToValue.get(key)!;
        }
        const newValueId = ++valueId;
        varToValue.set(key, newValueId);
        return newValueId;
    }
}

interface BinExp {
    key: string;
    operator: BinaryOperator;
    left: LiteralValue | IdentifierValue;
    right: LiteralValue | IdentifierValue;
}

type AllExpressionMap = Map<string, BinExp>;

type BasicBlockId = string;

type BinExpKey = string;

interface BasicBlockGenExp {
    basicBlock: BasicBlockId;
    resultSymbol: LocalSymbol;
}

type BasicBlockGenSet = Map<BinExpKey, BasicBlockGenExp>;

type BasicBlockGenSetCollection = Map<BasicBlockId, BasicBlockGenSet>;

type BasicBlockKillSet = Set<BinExpKey>;

type BasicBlockKillSetCollection = Map<BasicBlockId, BasicBlockKillSet>;

type ConnectedBasicBlockSymbol = Map<BasicBlockId, BasicBlockGenExp>;

type AvailableExpSet = Map<BinExpKey, ConnectedBasicBlockSymbol>;

type BasciBlockAvailableExpRecord = Map<BasicBlockId, AvailableExpSet>;

/**
 * Do common subexpression elimination in the whole method
 *
 * @param cfg
 */
export function globalCommonExpressionElimination(cfg: ControlFlowGraph): ControlFlowGraph {
    const allBlockAvailableExpressionRecord = availableExpression(cfg);

    cfg.nodes.forEach(basicBlock => {
        const {id, codes} = basicBlock;
        const availableExpression = allBlockAvailableExpressionRecord.get(id)!;

        for (let i = 0; i < codes.length; i++) {
            const code = codes[i];
            switch (code.type) {
                case IRCodeType.binary:
                {
                    const left = varStringify(code.left);
                    const right = varStringify(code.right);
                    const calcKey = `${code.operator} ${left} ${right}`;

                    if (!availableExpression.has(calcKey)) {
                        break;
                    }

                    const connectedSymbols = [...availableExpression.get(calcKey)!.values()];
                    const symbol = connectedSymbols[0];
                    if (connectedSymbols.length > 1) {
                        for (let j = 1; j < connectedSymbols.length; j++) {
                            const currentSymbol = connectedSymbols[j];
                            const referencedBlockId = currentSymbol.basicBlock;
                            const referencedBlock = cfg.nodes.get(referencedBlockId)!;
                            const referencedBlockCodes = referencedBlock.codes;
                            for (let k = 0; k < referencedBlockCodes.length; k++) {
                                const referencedCode = referencedBlockCodes[k];
                                switch (referencedCode.type) {
                                    case IRCodeType.binary:
                                    {
                                        const isTargetBlock = varStringify(referencedCode.result)
                                        === `${ValueKind.Identifier} ${currentSymbol.resultSymbol.name}`;
                                        if (!isTargetBlock) {
                                            break;
                                        }
                                        referencedCode.result.symbol = symbol.resultSymbol;
                                        break;
                                    }
                                    case IRCodeType.assign:
                                    {
                                        const isTargetBlock = varStringify(referencedCode.right)
                                        === `${ValueKind.Identifier} ${currentSymbol.resultSymbol.name}`;

                                        if (!isTargetBlock) {
                                            break;
                                        }
                                        (referencedCode.right as IdentifierValue).symbol = symbol.resultSymbol;
                                        break;
                                    }
                                }
                            }
                        }

                    }
                    const newCode: AssignIRCode = {
                        type: IRCodeType.assign,
                        left: code.result,
                        right: {
                            kind: ValueKind.Identifier,
                            symbol: symbol.resultSymbol,
                        },
                    };
                    codes[i] = newCode;
                    break;

                }
            }
        }
    });

    return cfg;
}

function availableExpression(cfg: ControlFlowGraph) {
    const allExpressionMap = getAllExpression(cfg);
    const {blockGenSetRecord, blockKillSetRecord} = calcGenAndKillForAvailableExp(cfg, allExpressionMap);

    const blockInExpMap: BasciBlockAvailableExpRecord = new Map();
    const blockOutExpMap: BasciBlockAvailableExpRecord = new Map();

    // for all nodes n in N
    // OUT[n] = E - KILL[n];
    cfg.nodes.forEach(basicBlock => {
        const outExpSet: AvailableExpSet = new Map();
        const killSet = blockKillSetRecord.get(basicBlock.id)!;
        allExpressionMap.forEach(exp => {
            if (killSet.has(exp.key)) {
                return;
            }
            outExpSet.set(exp.key, new Map());
        });
        blockOutExpMap.set(basicBlock.id, outExpSet);
    });

    const changed = new Set<string>();
    cfg.nodes.forEach(basicBlock => changed.add(basicBlock.id));

    // IN[Entry] = emptyset;
    blockInExpMap.set('enter', new Map());

    // OUT[Entry] = GEN[Entry];
    const enterBlockGenSet = blockGenSetRecord.get('enter')!;
    const enterBlockOutExp: AvailableExpSet = new Map();
    enterBlockGenSet.forEach((value, key) => {
        enterBlockOutExp.set(key, new Map([[value.basicBlock, value]]));
    });
    blockOutExpMap.set('enter', enterBlockOutExp);

    // Changed = N - { Entry };
    changed.delete('enter');

    while (changed.size !== 0) {
        // choose a node n in Changed;
        const pickResult = changed.values().next();
        if (pickResult.done) {
            break;
        }
        const currentBasicBlockId = pickResult.value;

        // Changed = Changed - { n }
        changed.delete(currentBasicBlockId);

        // IN[n] = E;
        let initialInExpSet: AvailableExpSet = new Map();
        allExpressionMap.forEach(exp => {
            initialInExpSet.set(exp.key, new Map());
        });

        // for all nodes p in predecessors(n)
        const predecessors = cfg.predecessors.get(currentBasicBlockId)!;
        predecessors.forEach(predecessorId => {
            // IN[n] = IN[n] ∩ OUT[p];
            const predecessorOutExp = blockOutExpMap.get(predecessorId)!;
            initialInExpSet = intersectionAvailableExpSet(initialInExpSet, predecessorOutExp);
        });
        blockInExpMap.set(currentBasicBlockId, initialInExpSet);

        // kill
        const blockKillExp = blockKillSetRecord.get(currentBasicBlockId)!;
        // IN[n] - KILL[n]
        const difference = differenceAvailableExpSet(initialInExpSet, blockKillExp);

        // gen
        const blockGenExp = blockGenSetRecord.get(currentBasicBlockId)!;
        // OUT[n] = GEN[n] U (IN[n] - KILL[n])
        const newBlockOutExp = mergeAvailableExpSet(difference, blockGenExp);

        const lastBlockOutExp = blockOutExpMap.get(currentBasicBlockId)!;
        if (equalAvailableExpSet(lastBlockOutExp, newBlockOutExp)) {
            blockOutExpMap.set(currentBasicBlockId, newBlockOutExp);
            continue;
        }
        blockOutExpMap.set(currentBasicBlockId, newBlockOutExp);
        cfg.successors.get(currentBasicBlockId)!.forEach(successor => {
            changed.add(successor);
        });
    }

    return blockInExpMap;
}

function getAllExpression(cfg: ControlFlowGraph): AllExpressionMap {
    const expressionCollection = new Map<string, BinExp>();
    cfg.nodes.forEach(basicBlock => {
        basicBlock.codes.forEach(code => {
            switch (code.type) {
                case IRCodeType.binary:
                {
                    if (
                        code.left.kind === ValueKind.Identifier && code.left.symbol.kind === 'global'
                        || code.right.kind === ValueKind.Identifier && code.right.symbol.kind === 'global'
                    ) {
                        return;
                    }
                    const left = varStringify(code.left);
                    const right = varStringify(code.right);
                    const calcKey = `${code.operator} ${left} ${right}`;
                    expressionCollection.set(calcKey, {
                        key: calcKey,
                        operator: code.operator,
                        left: code.left,
                        right: code.right,
                    });
                }
            }
        });
    });
    return expressionCollection;
}

function calcGenAndKillForAvailableExp(
    cfg: ControlFlowGraph,
    allExpressionMap: AllExpressionMap
) {
    /**
     * gen and kill set
     * key is the id of basic block
     */
    const blockGenSetRecord: BasicBlockGenSetCollection = new Map();
    const blockKillSetRecord: BasicBlockKillSetCollection = new Map();

    cfg.nodes.forEach(basicBlock => {
        const genSet: BasicBlockGenSet = new Map();
        const killSet: BasicBlockKillSet = new Set();
        basicBlock.codes.forEach(code => {
            switch (code.type) {
                case IRCodeType.binary:
                {
                    if (
                        code.left.kind === ValueKind.Identifier && code.left.symbol.kind === 'global'
                        || code.right.kind === ValueKind.Identifier && code.right.symbol.kind === 'global'
                    ) {
                        return;
                    }
                    const left = varStringify(code.left);
                    const right = varStringify(code.right);
                    const calcKey = `${code.operator} ${left} ${right}`;

                    genSet.set(calcKey, {
                        basicBlock: basicBlock.id,
                        resultSymbol: code.result.symbol as LocalSymbol,
                    });

                    const result = varStringify(code.result);
                    allExpressionMap.forEach(binExp => {
                        if (
                            varStringify(binExp.left) !== result
                            && varStringify(binExp.right) !== result
                        ) {
                            return;
                        }
                        killSet.add(binExp.key);
                    });
                }
            }
        });
        blockGenSetRecord.set(basicBlock.id, genSet);
        blockKillSetRecord.set(basicBlock.id, killSet);
    });

    return {blockGenSetRecord, blockKillSetRecord};
}

function intersectionAvailableExpSet(a: AvailableExpSet, b: AvailableExpSet): AvailableExpSet {
    const result: AvailableExpSet = new Map();
    const [larger, smaller] = a.size > b.size ? [a, b] : [b, a];
    larger.forEach((largerValue, key) => {
        if (smaller.has(key)) {
            const connectedBasicBlockSymbol: ConnectedBasicBlockSymbol = new Map();
            const smallerValue = smaller.get(key)!;
            smallerValue.forEach((value, basicBlockId) => {
                connectedBasicBlockSymbol.set(basicBlockId, value);
            });
            largerValue.forEach((value, basicBlockId) => {
                connectedBasicBlockSymbol.set(basicBlockId, value);
            });
            result.set(key, connectedBasicBlockSymbol);
        }
    });
    return result;
}

function differenceAvailableExpSet(a: AvailableExpSet, b: BasicBlockKillSet): AvailableExpSet {
    const result: AvailableExpSet = new Map();
    a.forEach((value, key) => {
        if (!b.has(key)) {
            result.set(key, value);
        }
    });
    return result;
}

function mergeAvailableExpSet(a: AvailableExpSet, b: BasicBlockGenSet): AvailableExpSet {
    const result: AvailableExpSet = new Map();
    a.forEach((value, key) => {
        result.set(key, new Map([...value.entries()]));
    });
    b.forEach((value, key) => {
        if (!result.has(key)) {
            result.set(key, new Map([[value.basicBlock, value]]));
            return;
        }
        const current = result.get(key)!;
        current.set(value.basicBlock, value);
    });
    return result;
}

function equalAvailableExpSet(a: AvailableExpSet, b: AvailableExpSet): boolean {
    return [...a.keys()].join('\n') === [...b.keys()].join('\n');
}

function varStringify(value: LiteralValue | IdentifierValue) {
    if (value.kind === ValueKind.Literal) {
        return `${value.kind} ${value.type} ${value.value}`;
    }
    else {
        return `${value.kind} ${value.symbol.name}`;
    }
}
