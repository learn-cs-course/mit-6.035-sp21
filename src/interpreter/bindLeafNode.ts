import {BaseNode} from '../types/grammar';
import {BindContext} from './bindProgram';

/**
 * identifier break continue literal 等节点
 * 不包含子节点，不涉及 parent 操作，且不涉及 symbolTable 操作
 * 因此统一用一个函数处理
 *
 * @param leafNode
 * @param context
 */
export function bindLeafNode(leafNode: BaseNode, context: BindContext): void {
    context.ruleRegistry.emit(leafNode, 'enter');
    context.ruleRegistry.emit(leafNode, 'exit');
}
