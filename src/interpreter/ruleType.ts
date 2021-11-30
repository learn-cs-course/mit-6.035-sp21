import {
    SyntaxKind,
    ProgramNode,
    ImportDeclarationNode,
    FieldDeclarationNode,
    MethodDeclarationNode,
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
}

type RuleFactory = (context: RuleContext) => Rule;

export interface RuleObject {
    name: string;
    create: RuleFactory;
}
