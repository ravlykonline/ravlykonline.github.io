// js/modules/ravlykParser.js
import {
    ERROR_MESSAGES,
} from './constants.js';
import { tokenizeWithMetadata } from './parserTokenizer.js';
import {
    getOperatorPrecedence as getOperatorPrecedenceHelper,
    parseAstExpressionOrThrow as parseAstExpressionOrThrowHelper,
} from './parserExpressions.js';
import {
    findClosingParenIndex as findClosingParenIndexHelper,
    parseAstBlockOrThrow as parseAstBlockOrThrowHelper,
    parseAstConditionOrThrow as parseAstConditionOrThrowHelper,
} from './parserBlocksConditions.js';
import { parseCreateStatementToAst as parseCreateStatementToAstHelper } from './parserCreateStatement.js';
import {
    parseAssignmentStatementToAst as parseAssignmentStatementToAstHelper,
    parseClearStatementToAst as parseClearStatementToAstHelper,
    parseColorStatementToAst as parseColorStatementToAstHelper,
    parseFunctionCallStatementToAst as parseFunctionCallStatementToAstHelper,
    parseGameStatementToAst as parseGameStatementToAstHelper,
    parseGotoStatementToAst as parseGotoStatementToAstHelper,
    parseIfStatementToAst as parseIfStatementToAstHelper,
    parseMoveStatementToAst as parseMoveStatementToAstHelper,
    parsePenStatementToAst as parsePenStatementToAstHelper,
    parseRepeatStatementToAst as parseRepeatStatementToAstHelper,
    parseTurnStatementToAst as parseTurnStatementToAstHelper,
} from './parserStatements.js';

const COMPARISON_OPERATORS = new Set(["=", "!=", "<", ">", "<=", ">="]);
const KEYWORD_IF = "\u044f\u043a\u0449\u043e";
const KEYWORD_ELSE = "\u0456\u043d\u0430\u043a\u0448\u0435";
const KEYWORD_KEY = "\u043a\u043b\u0430\u0432\u0456\u0448\u0430";
const KEYWORD_EDGE = "\u043a\u0440\u0430\u0439";
const KEYWORD_GAME = "\u0433\u0440\u0430\u0442\u0438";
const KEYWORD_BACKWARD = "\u043d\u0430\u0437\u0430\u0434";
const KEYWORD_LEFT = "\u043b\u0456\u0432\u043e\u0440\u0443\u0447";
const KEYWORD_PEN_UP = "\u043f\u0456\u0434\u043d\u044f\u0442\u0438";
const KEYWORD_GOTO_PREPOSITION = "\u0432";

class RavlykError extends Error {
    constructor(messageKey, ...params) {
        const messageTemplate = ERROR_MESSAGES[messageKey] || "\u041d\u0435\u0432\u0456\u0434\u043e\u043c\u0430 \u043f\u043e\u043c\u0438\u043b\u043a\u0430 \u0456\u043d\u0442\u0435\u0440\u043f\u0440\u0435\u0442\u0430\u0442\u043e\u0440\u0430";
        const message = typeof messageTemplate === 'function' ? messageTemplate(...params) : messageTemplate;
        super(message);
        this.name = "RavlykError";
        this.messageKey = messageKey;
        this.line = null;
        this.column = null;
        this.token = null;
    }
}

export class RavlykParser {
    constructor() {
        this.lastTokenMeta = null;
    }

    resetUserState() {
        // No-op in AST-only parser mode.
    }

    tokenize(codeStr) {
        const { tokens, meta } = this.tokenizeWithMetadata(codeStr);
        this.lastTokenMeta = meta;
        return tokens;
    }

    tokenizeWithMetadata(codeStr) {
        return tokenizeWithMetadata(codeStr);
    }

    attachErrorLocation(error, tokenIndex, tokenMeta) {
        if (!error || error.name !== "RavlykError") return;
        if (typeof error.line === "number" && error.line > 0) return;
        if (!tokenMeta || tokenIndex < 0 || tokenIndex >= tokenMeta.length) return;

        const location = tokenMeta[tokenIndex];
        if (!location) return;

        error.line = location.line;
        error.column = location.column;
        error.token = location.token;
    }

    normalizeIdentifier(identifier) {
        return String(identifier || "").toLowerCase();
    }

    isValidIdentifier(identifier) {
        return /^[\p{L}_][\p{L}\p{N}_-]*$/u.test(identifier);
    }

    getOperatorPrecedence(operator) {
        return getOperatorPrecedenceHelper(operator);
    }

    parseQuotedStringOrThrow(rawToken) {
        if (typeof rawToken !== "string" || rawToken.length < 2 || rawToken[0] !== '"' || rawToken[rawToken.length - 1] !== '"') {
            throw new RavlykError("UNKNOWN_COMMAND", rawToken);
        }
        return rawToken.slice(1, -1);
    }

    findClosingParenIndex(tokens, openParenIndex) {
        return findClosingParenIndexHelper(tokens, openParenIndex);
    }

    parseTokens(tokens, depth = 0, substitutions = {}, tokenMeta = null) {
        void tokens;
        void depth;
        void substitutions;
        void tokenMeta;
        throw new RavlykError("LEGACY_PARSE_PATH_REMOVED");
    }

    spanFromMeta(tokenMeta, startIndex, endIndexExclusive) {
        if (!Array.isArray(tokenMeta) || tokenMeta.length === 0) return null;
        const safeStart = Math.max(0, Math.min(startIndex, tokenMeta.length - 1));
        const safeEndExclusive = Math.max(safeStart + 1, Math.min(endIndexExclusive, tokenMeta.length));
        const start = tokenMeta[safeStart];
        const end = tokenMeta[safeEndExclusive - 1];
        if (!start || !end) return null;
        return {
            start: { line: start.line, column: start.column, token: start.token },
            end: {
                line: end.line,
                column: end.column + String(end.token || "").length,
                token: end.token,
            },
        };
    }

    parseAstExpressionPrimaryOrThrow(tokens, tokenMeta, startIndex) {
        return parseAstExpressionOrThrowHelper(tokens, tokenMeta, startIndex, {
            isValidIdentifier: (identifier) => this.isValidIdentifier(identifier),
            normalizeIdentifier: (identifier) => this.normalizeIdentifier(identifier),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            createUnknownCommandError: (token) => new RavlykError("UNKNOWN_COMMAND", token),
        });
    }

    parseAstExpressionUnaryOrThrow(tokens, tokenMeta, startIndex) {
        return this.parseAstExpressionPrimaryOrThrow(tokens, tokenMeta, startIndex);
    }

    parseAstExpressionWithPrecedenceOrThrow(tokens, tokenMeta, startIndex, minPrecedence) {
        void minPrecedence;
        return this.parseAstExpressionUnaryOrThrow(tokens, tokenMeta, startIndex);
    }

    parseAstExpressionOrThrow(tokens, tokenMeta, startIndex) {
        return this.parseAstExpressionWithPrecedenceOrThrow(tokens, tokenMeta, startIndex, 0);
    }

    parseAstBlockOrThrow(tokens, tokenMeta, openParenIndex) {
        return parseAstBlockOrThrowHelper({
            tokens,
            tokenMeta,
            openParenIndex,
            findClosingParenIndexFn: (inputTokens, inputOpenParenIndex) => this.findClosingParenIndex(inputTokens, inputOpenParenIndex),
            parseTokensToAst: (inputTokens, inputDepth, inputSubstitutions, inputTokenMeta) =>
                this.parseTokensToAst(inputTokens, inputDepth, inputSubstitutions, inputTokenMeta),
            spanFromMeta: (meta, startIndex, endIndex) => this.spanFromMeta(meta, startIndex, endIndex),
            createError: (messageKey) => new RavlykError(messageKey),
        });
    }

    parseAstConditionOrThrow(tokens, tokenMeta, startIndex) {
        return parseAstConditionOrThrowHelper({
            tokens,
            tokenMeta,
            startIndex,
            keywordIf: KEYWORD_IF,
            keywordEdge: KEYWORD_EDGE,
            keywordKey: KEYWORD_KEY,
            comparisonOperators: COMPARISON_OPERATORS,
            parseQuotedStringOrThrow: (rawToken) => this.parseQuotedStringOrThrow(rawToken),
            parseAstExpressionOrThrow: (inputTokens, inputMeta, inputStartIndex) =>
                this.parseAstExpressionOrThrow(inputTokens, inputMeta, inputStartIndex),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            createUnknownCommandError: (token) => new RavlykError("UNKNOWN_COMMAND", token),
        });
    }

    parseCreateStatementToAst(tokens, tokenMeta, startIndex) {
        return parseCreateStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            isValidIdentifier: (identifier) => this.isValidIdentifier(identifier),
            normalizeIdentifier: (identifier) => this.normalizeIdentifier(identifier),
            parseAstExpressionOrThrow: (inputTokens, inputMeta, inputStartIndex) =>
                this.parseAstExpressionOrThrow(inputTokens, inputMeta, inputStartIndex),
            parseAstBlockOrThrow: (inputTokens, inputMeta, inputOpenParenIndex) =>
                this.parseAstBlockOrThrow(inputTokens, inputMeta, inputOpenParenIndex),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
        });
    }

    parseGameStatementToAst(tokens, tokenMeta, startIndex) {
        return parseGameStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            parseAstBlockOrThrow: (inputTokens, inputMeta, inputOpenParenIndex) =>
                this.parseAstBlockOrThrow(inputTokens, inputMeta, inputOpenParenIndex),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
        });
    }

    parseMoveStatementToAst(tokens, tokenMeta, startIndex, tokenLower) {
        return parseMoveStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            tokenLower,
            parseAstExpressionOrThrow: (inputTokens, inputMeta, inputStartIndex) =>
                this.parseAstExpressionOrThrow(inputTokens, inputMeta, inputStartIndex),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            backwardKeyword: KEYWORD_BACKWARD,
        });
    }

    parseTurnStatementToAst(tokens, tokenMeta, startIndex, tokenLower) {
        return parseTurnStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            tokenLower,
            parseAstExpressionOrThrow: (inputTokens, inputMeta, inputStartIndex) =>
                this.parseAstExpressionOrThrow(inputTokens, inputMeta, inputStartIndex),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            leftKeyword: KEYWORD_LEFT,
        });
    }

    parseColorStatementToAst(tokens, tokenMeta, startIndex, token) {
        return parseColorStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            token,
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
        });
    }

    parsePenStatementToAst(tokenMeta, startIndex, tokenLower) {
        return parsePenStatementToAstHelper({
            tokenMeta,
            startIndex,
            tokenLower,
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            penUpKeyword: KEYWORD_PEN_UP,
        });
    }

    parseClearStatementToAst(tokenMeta, startIndex) {
        return parseClearStatementToAstHelper({
            tokenMeta,
            startIndex,
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
        });
    }

    parseGotoStatementToAst(tokens, tokenMeta, startIndex) {
        return parseGotoStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            parseAstExpressionOrThrow: (inputTokens, inputMeta, inputStartIndex) =>
                this.parseAstExpressionOrThrow(inputTokens, inputMeta, inputStartIndex),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            gotoPrepositionKeyword: KEYWORD_GOTO_PREPOSITION,
        });
    }

    parseRepeatStatementToAst(tokens, tokenMeta, startIndex) {
        return parseRepeatStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            parseAstExpressionOrThrow: (inputTokens, inputMeta, inputStartIndex) =>
                this.parseAstExpressionOrThrow(inputTokens, inputMeta, inputStartIndex),
            parseAstBlockOrThrow: (inputTokens, inputMeta, inputOpenParenIndex) =>
                this.parseAstBlockOrThrow(inputTokens, inputMeta, inputOpenParenIndex),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
        });
    }

    parseIfStatementToAst(tokens, tokenMeta, startIndex) {
        return parseIfStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            parseAstConditionOrThrow: (inputTokens, inputMeta, inputStartIndex) =>
                this.parseAstConditionOrThrow(inputTokens, inputMeta, inputStartIndex),
            parseAstBlockOrThrow: (inputTokens, inputMeta, inputOpenParenIndex) =>
                this.parseAstBlockOrThrow(inputTokens, inputMeta, inputOpenParenIndex),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
            keywordElse: KEYWORD_ELSE,
        });
    }

    parseAssignmentStatementToAst(tokens, tokenMeta, startIndex) {
        return parseAssignmentStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            parseAstExpressionOrThrow: (inputTokens, inputMeta, inputStartIndex) =>
                this.parseAstExpressionOrThrow(inputTokens, inputMeta, inputStartIndex),
            normalizeIdentifier: (identifier) => this.normalizeIdentifier(identifier),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
        });
    }

    parseFunctionCallStatementToAst(tokens, tokenMeta, startIndex) {
        return parseFunctionCallStatementToAstHelper({
            tokens,
            tokenMeta,
            startIndex,
            parseAstExpressionOrThrow: (inputTokens, inputMeta, inputStartIndex) =>
                this.parseAstExpressionOrThrow(inputTokens, inputMeta, inputStartIndex),
            normalizeIdentifier: (identifier) => this.normalizeIdentifier(identifier),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
        });
    }

    parseTokensToAst(tokens, depth = 0, substitutions = {}, tokenMeta = null) {
        const activeTokenMeta = tokenMeta || this.lastTokenMeta;
        const body = [];
        let i = 0;
        while (i < tokens.length) {
            try {
                const token = tokens[i];
                const tokenLower = token.toLowerCase();

                if (tokenLower === "\u0441\u0442\u0432\u043e\u0440\u0438\u0442\u0438" || tokenLower === "create") {
                    const created = this.parseCreateStatementToAst(tokens, activeTokenMeta, i);
                    body.push(created.stmt);
                    i = created.nextIndex;
                    continue;
                }

                if (tokenLower === KEYWORD_GAME || tokenLower === "game") {
                    const parsedGame = this.parseGameStatementToAst(tokens, activeTokenMeta, i);
                    body.push(parsedGame.stmt);
                    i = parsedGame.nextIndex;
                    continue;
                }

                if (tokenLower === "\u0432\u043f\u0435\u0440\u0435\u0434" || tokenLower === "forward" || tokenLower === KEYWORD_BACKWARD || tokenLower === "backward") {
                    const parsedMove = this.parseMoveStatementToAst(tokens, activeTokenMeta, i, tokenLower);
                    body.push(parsedMove.stmt);
                    i = parsedMove.nextIndex;
                    continue;
                }

                if (tokenLower === "\u043f\u0440\u0430\u0432\u043e\u0440\u0443\u0447" || tokenLower === "right" || tokenLower === KEYWORD_LEFT || tokenLower === "left") {
                    const parsedTurn = this.parseTurnStatementToAst(tokens, activeTokenMeta, i, tokenLower);
                    body.push(parsedTurn.stmt);
                    i = parsedTurn.nextIndex;
                    continue;
                }

                if (tokenLower === "\u043a\u043e\u043b\u0456\u0440" || tokenLower === "color") {
                    const parsedColor = this.parseColorStatementToAst(tokens, activeTokenMeta, i, token);
                    body.push(parsedColor.stmt);
                    i = parsedColor.nextIndex;
                    continue;
                }

                if (tokenLower === KEYWORD_PEN_UP || tokenLower === "penup" || tokenLower === "\u043e\u043f\u0443\u0441\u0442\u0438\u0442\u0438" || tokenLower === "pendown") {
                    const parsedPen = this.parsePenStatementToAst(activeTokenMeta, i, tokenLower);
                    body.push(parsedPen.stmt);
                    i = parsedPen.nextIndex;
                    continue;
                }

                if (tokenLower === "\u043e\u0447\u0438\u0441\u0442\u0438\u0442\u0438" || tokenLower === "clear") {
                    const parsedClear = this.parseClearStatementToAst(activeTokenMeta, i);
                    body.push(parsedClear.stmt);
                    i = parsedClear.nextIndex;
                    continue;
                }

                if (tokenLower === "\u043f\u0435\u0440\u0435\u0439\u0442\u0438" || tokenLower === "goto") {
                    const parsedGoto = this.parseGotoStatementToAst(tokens, activeTokenMeta, i);
                    body.push(parsedGoto.stmt);
                    i = parsedGoto.nextIndex;
                    continue;
                }

                if (tokenLower === "\u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0438" || tokenLower === "\u043f\u043e\u0432\u0442\u043e\u0440\u0438" || tokenLower === "repeat") {
                    const parsedRepeat = this.parseRepeatStatementToAst(tokens, activeTokenMeta, i);
                    body.push(parsedRepeat.stmt);
                    i = parsedRepeat.nextIndex;
                    continue;
                }

                if (tokenLower === KEYWORD_IF || tokenLower === "if") {
                    const parsedIf = this.parseIfStatementToAst(tokens, activeTokenMeta, i);
                    body.push(parsedIf.stmt);
                    i = parsedIf.nextIndex;
                    continue;
                }

                if (this.isValidIdentifier(token) && i + 1 < tokens.length && tokens[i + 1] === "=") {
                    const parsedAssignment = this.parseAssignmentStatementToAst(tokens, activeTokenMeta, i);
                    body.push(parsedAssignment.stmt);
                    i = parsedAssignment.nextIndex;
                    continue;
                }

                if (this.isValidIdentifier(token) && i + 1 < tokens.length && tokens[i + 1] === "(") {
                    const parsedFunctionCall = this.parseFunctionCallStatementToAst(tokens, activeTokenMeta, i);
                    body.push(parsedFunctionCall.stmt);
                    i = parsedFunctionCall.nextIndex;
                    continue;
                }

                if (token === "(" || token === ")") {
                    throw new RavlykError("UNKNOWN_COMMAND", `${token} (\u043d\u0435\u043e\u0447\u0456\u043a\u0443\u0432\u0430\u043d\u0430 \u0434\u0443\u0436\u043a\u0430)`);
                }

                throw new RavlykError("UNKNOWN_COMMAND", token);
            } catch (error) {
                this.attachErrorLocation(error, i, activeTokenMeta);
                throw error;
            }
        }

        return { type: "Program", body, span: this.spanFromMeta(activeTokenMeta, 0, tokens.length) };
    }

    parseCodeToAst(codeStr) {
        const { tokens, meta } = this.tokenizeWithMetadata(codeStr);
        this.lastTokenMeta = meta;
        return this.parseTokensToAst(tokens, 0, {}, meta);
    }
}

export { RavlykError };
