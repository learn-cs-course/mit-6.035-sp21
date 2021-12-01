import {
    SyntaxKind,
    ProgramNode,
    ImportDeclarationNode,
    FieldDeclarationNode,
    MethodDeclarationNode,
    ParameterNode,
    ArrayDeclarationNode,
    AssignmentStatementNode,
    IfStatementNode,
    ForStatementNode,
    ForInitializerNode,
    ForIncrementNode,
    WhileStatementNode,
    ReturnStatementNode,
    ContinueStatementNode,
    BreakStatementNode,
    CallExpressionNode,
    ArrayLocationNode,
    IdentifierNode,
} from '../types/grammar';
import {SymbolTable} from './symbolTable';

interface RuleContext {
    symbolTable: SymbolTable;
    report: (message: string) => void;
}

export interface Rule {
    [SyntaxKind.Program]?: (node: ProgramNode) => void;
    ['Program:exit']?: (node: ProgramNode) => void;
    [SyntaxKind.ImportDeclaration]?: (node: ImportDeclarationNode) => void;
    ['ImportDeclaration:exit']?: (node: ImportDeclarationNode) => void;
    [SyntaxKind.FieldDeclaration]?: (node: FieldDeclarationNode) => void;
    ['FieldDeclaration:exit']?: (node: FieldDeclarationNode) => void;
    [SyntaxKind.MethodDeclaration]?: (node: MethodDeclarationNode) => void;
    ['MethodDeclaration:exit']?: (node: MethodDeclarationNode) => void;
    [SyntaxKind.Parameter]?: (node: ParameterNode) => void;
    ['Parameter:exit']?: (node: ParameterNode) => void;
    [SyntaxKind.ArrayDeclaration]?: (node: ArrayDeclarationNode) => void;
    ['ArrayDeclaration:exit']?: (node: ArrayDeclarationNode) => void;
    [SyntaxKind.AssignmentStatement]?: (node: AssignmentStatementNode) => void;
    ['AssignmentStatement:exit']?: (node: AssignmentStatementNode) => void;
    [SyntaxKind.IfStatement]?: (node: IfStatementNode) => void;
    ['IfStatement:exit']?: (node: IfStatementNode) => void;
    [SyntaxKind.ForStatement]?: (node: ForStatementNode) => void;
    ['ForStatement:exit']?: (node: ForStatementNode) => void;
    [SyntaxKind.ForInitializer]?: (node: ForInitializerNode) => void;
    ['ForInitializer:exit']?: (node: ForInitializerNode) => void;
    [SyntaxKind.ForIncrement]?: (node: ForIncrementNode) => void;
    ['ForIncrement:exit']?: (node: ForIncrementNode) => void;
    [SyntaxKind.WhileStatement]?: (node: WhileStatementNode) => void;
    ['WhileStatement:exit']?: (node: WhileStatementNode) => void;
    [SyntaxKind.ReturnStatement]?: (node: ReturnStatementNode) => void;
    ['ReturnStatement:exit']?: (node: ReturnStatementNode) => void;
    [SyntaxKind.ContinueStatement]?: (node: ContinueStatementNode) => void;
    ['ContinueStatement:exit']?: (node: ContinueStatementNode) => void;
    [SyntaxKind.BreakStatement]?: (node: BreakStatementNode) => void;
    ['BreakStatement:exit']?: (node: BreakStatementNode) => void;
    [SyntaxKind.CallExpression]?: (node: CallExpressionNode) => void;
    ['CallExpression:exit']?: (node: CallExpressionNode) => void;
    [SyntaxKind.ArrayLocation]?: (node: ArrayLocationNode) => void;
    ['ArrayLocation:exit']?: (node: ArrayLocationNode) => void;
    [SyntaxKind.Identifier]?: (node: IdentifierNode) => void;
    ['Identifier:exit']?: (node: IdentifierNode) => void;
}

type RuleFactory = (context: RuleContext) => Rule;

export interface RuleObject {
    name: string;
    create: RuleFactory;
}
