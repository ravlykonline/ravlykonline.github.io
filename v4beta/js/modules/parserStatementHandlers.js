import { parseCreateStatementToAst as parseCreateStatementToAstHelper } from './parserCreateStatement.js';
import {
    parseAssignmentStatementToAst as parseAssignmentStatementToAstHelper,
    parseBackgroundStatementToAst as parseBackgroundStatementToAstHelper,
    parseClearStatementToAst as parseClearStatementToAstHelper,
    parseColorStatementToAst as parseColorStatementToAstHelper,
    parseFunctionCallStatementToAst as parseFunctionCallStatementToAstHelper,
    parseGotoStatementToAst as parseGotoStatementToAstHelper,
    parseMoveStatementToAst as parseMoveStatementToAstHelper,
    parsePenStatementToAst as parsePenStatementToAstHelper,
    parseTurnStatementToAst as parseTurnStatementToAstHelper,
} from './parserStatements.js';
import {
    parseGameStatementToAst as parseGameStatementToAstHelper,
    parseIfStatementToAst as parseIfStatementToAstHelper,
    parseRepeatStatementToAst as parseRepeatStatementToAstHelper,
} from './parserControlStatements.js';

function createParserBindings(parser) {
    return {
        spanFromMeta: (meta, from, to) => parser.spanFromMeta(meta, from, to),
        parseAstExpressionOrThrow: (tokens, tokenMeta, startIndex) =>
            parser.parseAstExpressionOrThrow(tokens, tokenMeta, startIndex),
        parseAstBlockOrThrow: (tokens, tokenMeta, openParenIndex) =>
            parser.parseAstBlockOrThrow(tokens, tokenMeta, openParenIndex),
        parseAstConditionOrThrow: (tokens, tokenMeta, startIndex) =>
            parser.parseAstConditionOrThrow(tokens, tokenMeta, startIndex),
        normalizeIdentifier: (identifier) => parser.normalizeIdentifier(identifier),
        isValidIdentifier: (identifier) => parser.isValidIdentifier(identifier),
    };
}

export function createParserStatementHandlers({
    parser,
    keywords,
    createError,
}) {
    const bindings = createParserBindings(parser);

    return {
        isValidIdentifier: bindings.isValidIdentifier,
        parseCreateStatementToAst: (tokens, tokenMeta, startIndex) =>
            parseCreateStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                isValidIdentifier: bindings.isValidIdentifier,
                normalizeIdentifier: bindings.normalizeIdentifier,
                parseAstExpressionOrThrow: bindings.parseAstExpressionOrThrow,
                parseAstBlockOrThrow: bindings.parseAstBlockOrThrow,
                spanFromMeta: bindings.spanFromMeta,
                createError,
            }),
        parseGameStatementToAst: (tokens, tokenMeta, startIndex) =>
            parseGameStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                parseAstBlockOrThrow: bindings.parseAstBlockOrThrow,
                spanFromMeta: bindings.spanFromMeta,
                createError,
            }),
        parseMoveStatementToAst: (tokens, tokenMeta, startIndex, tokenLower) =>
            parseMoveStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                tokenLower,
                parseAstExpressionOrThrow: bindings.parseAstExpressionOrThrow,
                spanFromMeta: bindings.spanFromMeta,
                backwardKeyword: keywords.backward,
            }),
        parseTurnStatementToAst: (tokens, tokenMeta, startIndex, tokenLower) =>
            parseTurnStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                tokenLower,
                parseAstExpressionOrThrow: bindings.parseAstExpressionOrThrow,
                spanFromMeta: bindings.spanFromMeta,
                leftKeyword: keywords.left,
            }),
        parseColorStatementToAst: (tokens, tokenMeta, startIndex, token) =>
            parseColorStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                token,
                spanFromMeta: bindings.spanFromMeta,
                createError,
            }),
        parseBackgroundStatementToAst: (tokens, tokenMeta, startIndex, token) =>
            parseBackgroundStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                token,
                spanFromMeta: bindings.spanFromMeta,
                createError,
            }),
        parsePenStatementToAst: (tokenMeta, startIndex, tokenLower) =>
            parsePenStatementToAstHelper({
                tokenMeta,
                startIndex,
                tokenLower,
                spanFromMeta: bindings.spanFromMeta,
                penUpKeyword: keywords.penUp,
            }),
        parseClearStatementToAst: (tokenMeta, startIndex) =>
            parseClearStatementToAstHelper({
                tokenMeta,
                startIndex,
                spanFromMeta: bindings.spanFromMeta,
            }),
        parseGotoStatementToAst: (tokens, tokenMeta, startIndex) =>
            parseGotoStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                parseAstExpressionOrThrow: bindings.parseAstExpressionOrThrow,
                spanFromMeta: bindings.spanFromMeta,
                gotoPrepositionKeyword: keywords.gotoPreposition,
            }),
        parseRepeatStatementToAst: (tokens, tokenMeta, startIndex) =>
            parseRepeatStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                parseAstExpressionOrThrow: bindings.parseAstExpressionOrThrow,
                parseAstBlockOrThrow: bindings.parseAstBlockOrThrow,
                spanFromMeta: bindings.spanFromMeta,
                createError,
            }),
        parseIfStatementToAst: (tokens, tokenMeta, startIndex) =>
            parseIfStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                parseAstConditionOrThrow: bindings.parseAstConditionOrThrow,
                parseAstBlockOrThrow: bindings.parseAstBlockOrThrow,
                spanFromMeta: bindings.spanFromMeta,
                createError,
                keywordElse: keywords.elseKeyword,
            }),
        parseAssignmentStatementToAst: (tokens, tokenMeta, startIndex) =>
            parseAssignmentStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                parseAstExpressionOrThrow: bindings.parseAstExpressionOrThrow,
                normalizeIdentifier: bindings.normalizeIdentifier,
                spanFromMeta: bindings.spanFromMeta,
            }),
        parseFunctionCallStatementToAst: (tokens, tokenMeta, startIndex) =>
            parseFunctionCallStatementToAstHelper({
                tokens,
                tokenMeta,
                startIndex,
                parseAstExpressionOrThrow: bindings.parseAstExpressionOrThrow,
                normalizeIdentifier: bindings.normalizeIdentifier,
                spanFromMeta: bindings.spanFromMeta,
                createError,
            }),
    };
}
