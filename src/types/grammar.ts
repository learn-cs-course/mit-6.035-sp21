export const enum SyntaxKind {

    Unknown = 'Unknown',
    EndOfFileToken = 'EndOfFileToken',

    // Literals
    CharLiteral = 'CharLiteral',
    IntLiteral = 'IntLiteral',
    StringLiteral = 'StringLiteral',

    Identifier = 'Identifier',

    // keywords
    BoolKeyword = 'BoolKeyword',
    IntKeyword = 'IntKeyword',
    VoidKeyword = 'VoidKeyword',
    BreakKeyword = 'BreakKeyword',
    ContinueKeyword = 'ContinueKeyword',
    ElseKeyword = 'ElseKeyword',
    FalseKeyword = 'FalseKeyword',
    ForKeyword = 'ForKeyword',
    IfKeyword = 'IfKeyword',
    ImportKeyword = 'ImportKeyword',
    LenKeyword = 'LenKeyword',
    ReturnKeyword = 'ReturnKeyword',
    TrueKeyword = 'TrueKeyword',
    WhileKeyword = 'WhileKeyword',

    // tokens
    OpenBraceToken = 'OpenBraceToken',
    CloseBraceToken = 'CloseBraceToken',
    OpenParenToken = 'OpenParenToken',
    CloseParenToken = 'CloseParenToken',
    OpenBracketToken = 'OpenBracketToken',
    CloseBracketToken = 'CloseBracketToken',
    SemicolonToken = 'SemicolonToken',
    CommaToken = 'CommaToken',
    LessThanToken = 'LessThanToken',
    GreaterThanToken = 'GreaterThanToken',
    LessThanEqualsToken = 'LessThanEqualsToken',
    GreaterThanEqualsToken = 'GreaterThanEqualsToken',
    EqualsEqualsToken = 'EqualsEqualsToken',
    ExclamationEqualsToken = 'ExclamationEqualsToken',
    PlusToken = 'PlusToken',
    MinusToken = 'MinusToken',
    AsteriskToken = 'AsteriskToken',
    SlashToken = 'SlashToken',
    PercentToken = 'PercentToken',
    PlusPlusToken = 'PlusPlusToken',
    MinusMinusToken = 'MinusMinusToken',
    ExclamationToken = 'ExclamationToken',
    AmpersandAmpersandToken = 'AmpersandAmpersandToken',
    BarBarToken = 'BarBarToken',
    EqualsToken = 'EqualsToken',
    PlusEqualsToken = 'PlusEqualsToken',
    MinusEqualsToken = 'MinusEqualsToken',

    // Top level
    Program = 'Program',

    // Declaration
    ImportDeclaration = 'ImportDeclaration',
    FieldDeclaration = 'FieldDeclaration',
    MethodDeclaration = 'MethodDeclaration',

    // Statement
    AssignmentStatement = 'AssignmentStatement',
    CallStatement = 'CallStatement',
    BreakStatement = 'BreakStatement',
    ContinueStatement = 'ContinueStatement',
    WhileStatement = 'WhileStatement',
    ReturnStatement = 'ReturnStatement',
    IfStatement = 'IfStatement',
    ForStatement = 'ForStatement',

    // Expression
    CallExpression = 'CallExpression',
    BinaryExpression = 'BinaryExpression',
    UnaryExpression = 'UnaryExpression',
    ParenthesizedExpression = 'ParenthesizedExpression',

    // Element
    ArrayDeclaration = 'ArrayDeclaration',
    Parameter = 'Parameter',
    Block = 'Block',
    ArrayLocation = 'ArrayLocation',
    ForInitializer = 'ForInitializer',
    ForIncrement = 'ForIncrement',
}

export type KeywordSyntaxKind = SyntaxKind.BoolKeyword
    | SyntaxKind.BreakKeyword
    | SyntaxKind.ContinueKeyword
    | SyntaxKind.ElseKeyword
    | SyntaxKind.FalseKeyword
    | SyntaxKind.ForKeyword
    | SyntaxKind.IfKeyword
    | SyntaxKind.ImportKeyword
    | SyntaxKind.IntKeyword
    | SyntaxKind.LenKeyword
    | SyntaxKind.ReturnKeyword
    | SyntaxKind.TrueKeyword
    | SyntaxKind.VoidKeyword
    | SyntaxKind.WhileKeyword;

export const enum CharacterCodes {
    nullCharacter = 0,
    maxAsciiCharacter = 0x7F,

    lineFeed = 0x0A, // \n
    carriageReturn = 0x0D, // \r
    space = 0x20, // " "

    _ = 0x5F,
    $ = 0x24,

    _0 = 0x30,
    _1 = 0x31,
    _2 = 0x32,
    _3 = 0x33,
    _4 = 0x34,
    _5 = 0x35,
    _6 = 0x36,
    _7 = 0x37,
    _8 = 0x38,
    _9 = 0x39,

    a = 0x61,
    b = 0x62,
    c = 0x63,
    d = 0x64,
    e = 0x65,
    f = 0x66,
    g = 0x67,
    h = 0x68,
    i = 0x69,
    j = 0x6A,
    k = 0x6B,
    l = 0x6C,
    m = 0x6D,
    n = 0x6E,
    o = 0x6F,
    p = 0x70,
    q = 0x71,
    r = 0x72,
    s = 0x73,
    t = 0x74,
    u = 0x75,
    v = 0x76,
    w = 0x77,
    x = 0x78,
    y = 0x79,
    z = 0x7A,

    A = 0x41,
    B = 0x42,
    C = 0x43,
    D = 0x44,
    E = 0x45,
    F = 0x46,
    G = 0x47,
    H = 0x48,
    I = 0x49,
    J = 0x4A,
    K = 0x4B,
    L = 0x4C,
    M = 0x4D,
    N = 0x4E,
    O = 0x4F,
    P = 0x50,
    Q = 0x51,
    R = 0x52,
    S = 0x53,
    T = 0x54,
    U = 0x55,
    V = 0x56,
    W = 0x57,
    X = 0x58,
    Y = 0x59,
    Z = 0x5a,

    ampersand = 0x26, // &
    asterisk = 0x2A, // *
    at = 0x40, // @
    backslash = 0x5C, // \
    backtick = 0x60, // `
    bar = 0x7C, // |
    caret = 0x5E, // ^
    closeBrace = 0x7D, // }
    closeBracket = 0x5D, // ]
    closeParen = 0x29, // )
    colon = 0x3A, // :
    comma = 0x2C, // ,
    dot = 0x2E, // .
    doubleQuote = 0x22, // "
    equals = 0x3D, // =
    exclamation = 0x21, // !
    greaterThan = 0x3E, // >
    hash = 0x23, // #
    lessThan = 0x3C, // <
    minus = 0x2D, // -
    openBrace = 0x7B, // {
    openBracket = 0x5B, // [
    openParen = 0x28, // (
    percent = 0x25, // %
    plus = 0x2B, // +
    question = 0x3F, // ?
    semicolon = 0x3B, // ;
    singleQuote = 0x27, // '
    slash = 0x2F, // /
    tilde = 0x7E, // ~

    backspace = 0x08, // \b
    formFeed = 0x0C, // \f
    tab = 0x09, // \t
    verticalTab = 0x0B, // \v
}

interface IdentifierSymbol {
    name: string;
    type: Type;
    declaration: DeclarationNode;
}

export const enum Type {
    Unknown,
    Bool,
    BoolArray,
    Int,
    IntArray,
    Char,
    Method,
}

/**
 * Ast Base Node
 */
export interface BaseNode {
    parent?: BaseNode;
    kind: SyntaxKind;
    pos: number;
    end: number;
}

export interface ProgramNode extends BaseNode {
    parent?: undefined;
    kind: SyntaxKind.Program;
    importDeclarations: ImportDeclarationNode[];
    fieldDeclarations: FieldDeclarationNode[];
    methodDeclarations: MethodDeclarationNode[];
    globals?: Map<string, IdentifierSymbol>;
}

export type DeclarationNode = ImportDeclarationNode
    | FieldDeclarationNode
    | MethodDeclarationNode
    | ParameterNode;

export interface ImportDeclarationNode extends BaseNode {
    parent?: ProgramNode;
    kind: SyntaxKind.ImportDeclaration;
    importName: IdentifierNode;
}

export interface FieldDeclarationNode extends BaseNode {
    parent?: ProgramNode | BlockNode;
    kind: SyntaxKind.FieldDeclaration;
    type: SyntaxKind.IntKeyword | SyntaxKind.BoolKeyword;
    declarations: VariableDeclarationNode[];
}

export interface MethodDeclarationNode extends BaseNode {
    parent?: ProgramNode;
    kind: SyntaxKind.MethodDeclaration;
    name: IdentifierNode;
    parameters: ParameterNode[];
    returnType: SyntaxKind.IntKeyword | SyntaxKind.BoolKeyword | SyntaxKind.VoidKeyword;
    body: BlockNode;
}

export type VariableDeclarationNode = IdentifierNode | ArrayDeclarationNode;

export interface IdentifierNode extends BaseNode {
    parent?: ImportDeclarationNode
        | FieldDeclarationNode
        | MethodDeclarationNode
        | ArrayDeclarationNode
        | ParameterNode
        | AssignmentStatementNode
        | IfStatementNode
        | ForStatementNode
        | WhileStatementNode
        | ReturnStatementNode
        | ForInitializerNode
        | ForIncrementNode
        | UnaryExpressionNode
        | BinaryExpressionNode
        | ParenthesizedExpressionNode
        | ArrayLocationNode
        | CallExpressionNode;
    kind: SyntaxKind.Identifier;
    name: string;
}

export interface ArrayDeclarationNode extends BaseNode {
    kind: SyntaxKind.ArrayDeclaration;
    name: IdentifierNode;
    size: IntLiteralNode;
}

export interface ParameterNode extends BaseNode {
    kind: SyntaxKind.Parameter;
    name: IdentifierNode;
    type: SyntaxKind.IntKeyword | SyntaxKind.BoolKeyword;
}

export interface BlockNode extends BaseNode {
    kind: SyntaxKind.Block;
    fields: FieldDeclarationNode[];
    statements: StatementNode[];
}

export type StatementNode = AssignmentStatementNode
    | CallStatementNode
    | IfStatementNode
    | ForStatementNode
    | WhileStatementNode
    | ReturnStatementNode
    | BreakStatementNode
    | ContinueStatementNode;

export interface CallStatementNode extends BaseNode {
    kind: SyntaxKind.CallStatement;
    expression: CallExpressionNode;
}

export interface IfStatementNode extends BaseNode {
    kind: SyntaxKind.IfStatement;
    condition: ExpressionNode;
    thenBlock: BlockNode;
    elseBlock?: BlockNode;
}

export interface ForStatementNode extends BaseNode {
    kind: SyntaxKind.ForStatement;
    initializer: ForInitializerNode;
    condition: ExpressionNode;
    increment: ForIncrementNode;
    body: BlockNode;
}

export interface ForInitializerNode extends BaseNode {
    kind: SyntaxKind.ForInitializer;
    declaration: IdentifierNode;
    expression: ExpressionNode;
}

export interface ForIncrementNode extends BaseNode {
    kind: SyntaxKind.ForIncrement;
    declaration: LocationNode;
    operator: SyntaxKind.PlusEqualsToken
        | SyntaxKind.MinusEqualsToken
        | SyntaxKind.PlusPlusToken
        | SyntaxKind.MinusMinusToken;
    expression?: ExpressionNode;
}

export interface WhileStatementNode extends BaseNode {
    kind: SyntaxKind.WhileStatement;
    condition: ExpressionNode;
    body: BlockNode;
}

export interface ReturnStatementNode extends BaseNode {
    kind: SyntaxKind.ReturnStatement;
    expression?: ExpressionNode;
}

export interface BreakStatementNode extends BaseNode {
    kind: SyntaxKind.BreakStatement;
}

export interface ContinueStatementNode extends BaseNode {
    kind: SyntaxKind.ContinueStatement;
}

export interface AssignmentStatementNode extends BaseNode {
    kind: SyntaxKind.AssignmentStatement;
    left: LocationNode;
    right?: ExpressionNode;
    operator: SyntaxKind.EqualsToken
        | SyntaxKind.PlusEqualsToken
        | SyntaxKind.MinusEqualsToken
        | SyntaxKind.PlusPlusToken
        | SyntaxKind.MinusMinusToken;
}

export type ExpressionNode = LocationNode
    | CallExpressionNode
    | BinaryExpressionNode
    | UnaryExpressionNode
    | ParenthesizedExpressionNode
    | LiteralNode;

export type LocationNode = IdentifierNode | ArrayLocationNode;

export interface ArrayLocationNode extends BaseNode {
    kind: SyntaxKind.ArrayLocation;
    name: IdentifierNode;
    index: ExpressionNode;
}

export interface CallExpressionNode extends BaseNode {
    kind: SyntaxKind.CallExpression;
    callee: IdentifierNode;
    arguments: ArgumentNode[];
}

export type ArgumentNode = ExpressionNode | StringLiteralNode;

export interface BinaryExpressionNode extends BaseNode {
    kind: SyntaxKind.BinaryExpression;
    left: ExpressionNode;
    right: ExpressionNode;
    operator: SyntaxKind.PlusToken
        | SyntaxKind.MinusToken
        | SyntaxKind.AsteriskToken
        | SyntaxKind.SlashToken
        | SyntaxKind.PercentToken
        | SyntaxKind.GreaterThanToken
        | SyntaxKind.LessThanToken
        | SyntaxKind.GreaterThanEqualsToken
        | SyntaxKind.LessThanEqualsToken
        | SyntaxKind.EqualsEqualsToken
        | SyntaxKind.ExclamationEqualsToken
        | SyntaxKind.AmpersandAmpersandToken
        | SyntaxKind.BarBarToken;
}

export interface UnaryExpressionNode extends BaseNode {
    kind: SyntaxKind.UnaryExpression;
    operator: SyntaxKind.MinusToken
        | SyntaxKind.ExclamationToken;
    operand: ExpressionNode;
}

export interface ParenthesizedExpressionNode extends BaseNode {
    kind: SyntaxKind.ParenthesizedExpression;
    expression: ExpressionNode;
}

export type LiteralNode = IntLiteralNode
    | CharLiteralNode
    | BoolLiteralNode;

export interface IntLiteralNode extends BaseNode {
    kind: SyntaxKind.IntLiteral;
    value: string;
}

export interface CharLiteralNode extends BaseNode {
    kind: SyntaxKind.CharLiteral;
    value: string;
}

export interface BoolLiteralNode extends BaseNode {
    kind: SyntaxKind.TrueKeyword | SyntaxKind.FalseKeyword;
    value: boolean;
}

export interface StringLiteralNode extends BaseNode {
    kind: SyntaxKind.StringLiteral;
    value: string;
}
