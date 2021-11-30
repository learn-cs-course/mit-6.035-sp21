import {AssignmentStatementNode, SyntaxKind} from '../types/grammar';
import {bindArrayLocation} from './bindArrayLocation';
import {bindExpression} from './bindExpression';
import {bindLeafNode} from './bindLeafNode';
import {BindContext} from './bindProgram';

export function bindAssignmentStatement(
    assignmentStatement: AssignmentStatementNode,
    context: BindContext): void {
    context.ruleRegistry.emit(assignmentStatement, 'enter');

    const {left, right} = assignmentStatement;

    left.parent = assignmentStatement;
    if (left.kind === SyntaxKind.Identifier) {
        bindLeafNode(left, context);
    }
    else {
        bindArrayLocation(left, context);
    }

    if (right) {
        right.parent = assignmentStatement;
        bindExpression(right, context);
    }

    context.ruleRegistry.emit(assignmentStatement, 'exit');
}
