/* eslint-disable max-depth,max-statements,complexity,@typescript-eslint/init-declarations */
import {SyntaxKind, CharacterCodes} from '../types/grammar';
import {codePointAt} from '../core/codePointAt';
import {isLineBreak} from './utils';

export interface Scanner {
    getText: () => string;
    getStartPos: () => number;
    getToken: () => number;
    getTokenPos: () => number;
    getTokenValue: () => string;
    setText: (text: string) => void;
    scan: () => void;
}

export function createScanner(): Scanner {

    let text: string;

    // Current position (end position of text of current token)
    let pos: number;

    // end of text
    let end: number;

    // Start position of whitespace before current token
    let startPos: number;

    // Start position of text of current token
    let tokenPos: number;

    let token: SyntaxKind;
    let tokenValue!: string;

    function setText(newText: string) {
        text = newText;
        pos = 0;
        end = text.length;
        startPos = 0;
        tokenPos = 0;
        token = SyntaxKind.Unknown;
        tokenValue = undefined!;
    }

    function scanChar() {
        tokenValue += text[pos];
        const currentCharCode = text.charCodeAt(pos + 1);
        if (currentCharCode === CharacterCodes.backslash) {
            pos++;
            tokenValue += text[pos];
            const ch = text.charCodeAt(pos + 1);
            if (
                ch === CharacterCodes.t
                || ch === CharacterCodes.n
                || ch === CharacterCodes.singleQuote
                || ch === CharacterCodes.doubleQuote
                || ch === CharacterCodes.backslash
            ) {
                tokenValue += text[pos + 1];
                if (text.charCodeAt(pos + 2) === CharacterCodes.singleQuote) {
                    tokenValue += text[pos + 2];
                    pos += 3;
                    token = SyntaxKind.CharLiteral;
                    return token;
                }
            }
        }
        if (
            currentCharCode <= 126
            && currentCharCode >= 36
            && currentCharCode !== CharacterCodes.singleQuote
            && currentCharCode !== CharacterCodes.doubleQuote
        ) {
            pos++;
            tokenValue += text[pos];
            if (text.charCodeAt(pos + 1) === CharacterCodes.singleQuote) {
                tokenValue += text[pos + 1];
                pos += 2;
                token = SyntaxKind.CharLiteral;
                return token;
            }
        }
        throw new Error('Unterminated_string_literal');
    }

    function scan(): SyntaxKind {
        startPos = pos;
        tokenValue = '';
        // eslint-disable-next-line no-constant-condition
        while (true) {
            tokenPos = pos;
            if (pos >= end) {
                token = SyntaxKind.EndOfFileToken;
                return token;
            }
            const ch = codePointAt(text, pos);

            switch (ch) {
                // 换行
                case CharacterCodes.lineFeed:
                case CharacterCodes.carriageReturn:
                    pos++;
                    continue;

                // 空格
                case CharacterCodes.tab:
                case CharacterCodes.verticalTab:
                case CharacterCodes.formFeed:
                case CharacterCodes.space:
                case CharacterCodes.nonBreakingSpace:
                case CharacterCodes.ogham:
                case CharacterCodes.enQuad:
                case CharacterCodes.emQuad:
                case CharacterCodes.enSpace:
                case CharacterCodes.emSpace:
                case CharacterCodes.threePerEmSpace:
                case CharacterCodes.fourPerEmSpace:
                case CharacterCodes.sixPerEmSpace:
                case CharacterCodes.figureSpace:
                case CharacterCodes.punctuationSpace:
                case CharacterCodes.thinSpace:
                case CharacterCodes.hairSpace:
                case CharacterCodes.zeroWidthSpace:
                case CharacterCodes.narrowNoBreakSpace:
                case CharacterCodes.mathematicalSpace:
                case CharacterCodes.ideographicSpace:
                case CharacterCodes.byteOrderMark:
                    pos++;
                    continue;

                case CharacterCodes.exclamation:
                    if (text.charCodeAt(pos + 1) === CharacterCodes.equals) {
                        pos += 2;
                        token = SyntaxKind.ExclamationEqualsToken;
                    }
                    pos++;
                    token = SyntaxKind.ExclamationToken;
                    return token;

                case CharacterCodes.singleQuote:
                    return scanChar();

                case CharacterCodes.slash:
                    // Single-line comment
                    if (text.charCodeAt(pos + 1) === CharacterCodes.slash) {
                        pos += 2;

                        while (pos < end) {
                            if (isLineBreak(text.charCodeAt(pos))) {
                                break;
                            }
                            pos++;
                        }

                        continue;
                    }
                    // Multi-line comment
                    if (text.charCodeAt(pos + 1) === CharacterCodes.asterisk) {
                        pos += 2;

                        let commentClosed = false;
                        while (pos < end) {
                            const ch = text.charCodeAt(pos);

                            if (ch === CharacterCodes.asterisk && text.charCodeAt(pos + 1) === CharacterCodes.slash) {
                                pos += 2;
                                commentClosed = true;
                                break;
                            }

                            pos++;
                        }

                        if (!commentClosed) {
                            throw new Error('多行注释应以 */ 结尾');
                        }

                        continue;

                    }

                    pos++;
                    token = SyntaxKind.SlashToken;
                    return token;
                default:
                    pos++;
            }
        }
    }

    return {
        getText: () => text,
        getStartPos: () => startPos,
        getToken: () => token,
        getTokenPos: () => tokenPos,
        getTokenValue: () => tokenValue,
        setText,
        scan,
    };
}
