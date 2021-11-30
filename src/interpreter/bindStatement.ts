import {StatementNode, SyntaxKind} from '../types/grammar';
import {bindAssignmentStatement} from './bindAssignmentStatement';
import {bindLeafNode} from './bindLeafNode';
import {bindCallStatement} from './bindCallStatement';
import {BindContext} from './bindProgram';
import {bindWhileStatement} from './bindWhileStatement';
import {bindReturnStatement} from './bindReturnStatement';
import {bindIfStatement} from './bindIfStatement';
import {bindForStatement} from './bindForStatement';

/**
 * 对 Statement 节点进行语义检查
 * 由于 Statement 节点是一个抽象节点，其只需要做派发就可以了
 * 因此不需要调用 rule check 啥的
 *
 * @param statement
 * @param context
 */
export function bindStatement(statement: StatementNode, context: BindContext): void {
    switch (statement.kind) {
        case SyntaxKind.AssignmentStatement:
            bindAssignmentStatement(statement, context);
            break;
        case SyntaxKind.CallStatement:
            bindCallStatement(statement, context);
            break;
        case SyntaxKind.BreakStatement:
        case SyntaxKind.ContinueStatement:
            bindLeafNode(statement, context);
            break;
        case SyntaxKind.WhileStatement:
            bindWhileStatement(statement, context);
            break;
        case SyntaxKind.ReturnStatement:
            bindReturnStatement(statement, context);
            break;
        case SyntaxKind.IfStatement:
            bindIfStatement(statement, context);
            break;
        case SyntaxKind.ForStatement:
            bindForStatement(statement, context);
            break;
        default:
            throw new Error('Unknown statement kind');
    }
}
