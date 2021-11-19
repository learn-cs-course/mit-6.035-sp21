import {MapLike} from '../types/base';
import {SyntaxKind, KeywordSyntaxKind} from '../types/grammar';
import {getEntries} from '../core/getEntries';

const textToKeywordObj: MapLike<KeywordSyntaxKind> = {
    bool: SyntaxKind.BoolKeyword,
    break: SyntaxKind.BreakKeyword,
    continue: SyntaxKind.ContinueKeyword,
    else: SyntaxKind.ElseKeyword,
    false: SyntaxKind.FalseKeyword,
    for: SyntaxKind.ForKeyword,
    if: SyntaxKind.IfKeyword,
    import: SyntaxKind.ImportKeyword,
    int: SyntaxKind.IntKeyword,
    len: SyntaxKind.LenKeyword,
    return: SyntaxKind.ReturnKeyword,
    true: SyntaxKind.TrueKeyword,
    void: SyntaxKind.VoidKeyword,
    while: SyntaxKind.WhileKeyword,
};

export const textToKeyword = new Map(getEntries(textToKeywordObj));

export const textToToken = new Map(getEntries({
    ...textToKeywordObj,
    '{': SyntaxKind.OpenBraceToken,
    '}': SyntaxKind.CloseBraceToken,
    '(': SyntaxKind.OpenParenToken,
    ')': SyntaxKind.CloseParenToken,
    '[': SyntaxKind.OpenBracketToken,
    ']': SyntaxKind.CloseBracketToken,
    ';': SyntaxKind.SemicolonToken,
    ',': SyntaxKind.CommaToken,
    '<': SyntaxKind.LessThanToken,
    '>': SyntaxKind.GreaterThanToken,
    '<=': SyntaxKind.LessThanEqualsToken,
    '>=': SyntaxKind.GreaterThanEqualsToken,
    '==': SyntaxKind.EqualsEqualsToken,
    '!=': SyntaxKind.ExclamationEqualsToken,
    '+': SyntaxKind.PlusToken,
    '-': SyntaxKind.MinusToken,
    '*': SyntaxKind.AsteriskToken,
    '/': SyntaxKind.SlashToken,
    '%': SyntaxKind.PercentToken,
    '++': SyntaxKind.PlusPlusToken,
    '--': SyntaxKind.MinusMinusToken,
    '!': SyntaxKind.ExclamationToken,
    '&&': SyntaxKind.AmpersandAmpersandToken,
    '||': SyntaxKind.BarBarToken,
    '=': SyntaxKind.EqualsToken,
    '+=': SyntaxKind.PlusEqualsToken,
    '-=': SyntaxKind.MinusEqualsToken,
}));
