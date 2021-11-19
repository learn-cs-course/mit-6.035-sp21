import {binarySearch, identity, compareValues} from '../core/binarySearch';
import {CharacterCodes} from '../types/grammar';

/**
 * 是否为换行符，只考虑 \r \n
 *
 * @param ch
 * @returns
 */
export function isLineBreak(ch: number): boolean {
    return ch === CharacterCodes.lineFeed
        || ch === CharacterCodes.carriageReturn;
}

/**
 * 是否为控制字符，只考虑 \r \n \t \f
 *
 * @param ch
 * @returns
 */
export function isControlCharacter(ch: number): boolean {
    return ch === CharacterCodes.tab
        || ch === CharacterCodes.formFeed
        || isLineBreak(ch);
}

/**
 * 标识符首字符识别
 *
 * @param ch
 * @returns
 */
export function isIdentifierStart(ch: number): boolean {
    return ch >= CharacterCodes.A && ch <= CharacterCodes.Z
        || ch >= CharacterCodes.a && ch <= CharacterCodes.z
        || ch === CharacterCodes._;
}

/**
 * 标识符非首字符识别
 *
 * @param ch
 * @returns
 */
export function isIdentifierPart(ch: number): boolean {
    return isIdentifierStart(ch)
        || ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
}

/**
 * 是否为空白字符
 *
 * @param ch
 * @returns
 */
export function isWhiteSpaceSingleLine(ch: number): boolean {
    return ch === CharacterCodes.space
        || ch === CharacterCodes.tab
        || ch === CharacterCodes.verticalTab;
}

export function computeLineStarts(text: string): number[] {
    const result: number[] = [];
    let pos = 0;
    let lineStart = 0;
    while (pos < text.length) {
        const ch = text.charCodeAt(pos);
        pos++;
        switch (ch) {
            // @ts-expect-error
            case CharacterCodes.carriageReturn:
                if (text.charCodeAt(pos) === CharacterCodes.lineFeed) {
                    pos++;
                }
            // falls through
            case CharacterCodes.lineFeed:
                result.push(lineStart);
                lineStart = pos;
                break;
            default:
                if (ch > CharacterCodes.maxAsciiCharacter && isLineBreak(ch)) {
                    result.push(lineStart);
                    lineStart = pos;
                }
                break;
        }
    }
    result.push(lineStart);
    return result;
}

export interface LineAndCharacter {
    /** 0-based. */
    line: number;
    /*
     * 0-based.
     * This value denotes the character position in line and is different from the 'column' because of tab characters.
     */
    character: number;
}

export function computeLineOfPosition(lineStarts: readonly number[], position: number, lowerBound?: number) {
    let lineNumber = binarySearch(lineStarts, position, identity, compareValues, lowerBound);
    if (lineNumber < 0) {
        // If the actual position was not found,
        // the binary search returns the 2's-complement of the next line start
        // e.g. if the line starts at [5, 10, 23, 80] and the position requested was 20
        // then the search will return -2.
        //
        // We want the index of the previous line start, so we subtract 1.
        // Review 2's-complement if this is confusing.
        lineNumber = ~lineNumber - 1;
        if (lineNumber === -1) {
            throw new Error('position cannot precede the beginning of the file');
        }
    }
    return lineNumber;
}


export function computeLineAndCharacterOfPosition(lineStarts: readonly number[], position: number): LineAndCharacter {
    const lineNumber = computeLineOfPosition(lineStarts, position);
    return {
        line: lineNumber,
        character: position - lineStarts[lineNumber],
    };
}
