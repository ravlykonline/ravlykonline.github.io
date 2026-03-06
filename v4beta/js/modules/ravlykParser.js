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

const COMPARISON_OPERATORS = new Set(["=", "!=", "<", ">", "<=", ">="]);
const KEYWORD_IF = "\u044f\u043a\u0449\u043e";
const KEYWORD_ELSE = "\u0456\u043d\u0430\u043a\u0448\u0435";
const KEYWORD_KEY = "\u043a\u043b\u0430\u0432\u0456\u0448\u0430";
const KEYWORD_EDGE = "\u043a\u0440\u0430\u0439";
const KEYWORD_GAME = "\u0433\u0440\u0430\u0442\u0438";

class RavlykError extends Error {
    constructor(messageKey, ...params) {
        const messageTemplate = ERROR_MESSAGES[messageKey] || "Невідома помилка інтерпретатора";
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
                    if (i + 1 >= tokens.length || tokens[i + 1] !== "(") {
                        throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
                    }
                    const gameBlock = this.parseAstBlockOrThrow(tokens, activeTokenMeta, i + 1);
                    body.push({
                        type: "GameStmt",
                        body: gameBlock.body,
                        span: this.spanFromMeta(activeTokenMeta, i, gameBlock.nextIndex),
                    });
                    i = gameBlock.nextIndex;
                    continue;
                }

                if (tokenLower === "\u0432\u043f\u0435\u0440\u0435\u0434" || tokenLower === "forward" || tokenLower === "\u043d\u0430\u0437\u0430\u0434" || tokenLower === "backward") {
                    const parsedExpr = this.parseAstExpressionOrThrow(tokens, activeTokenMeta, i + 1);
                    body.push({
                        type: "MoveStmt",
                        direction: (tokenLower === "\u043d\u0430\u0437\u0430\u0434" || tokenLower === "backward") ? "backward" : "forward",
                        distance: parsedExpr.expr,
                        span: this.spanFromMeta(activeTokenMeta, i, parsedExpr.nextIndex),
                    });
                    i = parsedExpr.nextIndex;
                    continue;
                }

                if (tokenLower === "\u043f\u0440\u0430\u0432\u043e\u0440\u0443\u0447" || tokenLower === "right" || tokenLower === "\u043b\u0456\u0432\u043e\u0440\u0443\u0447" || tokenLower === "left") {
                    const parsedExpr = this.parseAstExpressionOrThrow(tokens, activeTokenMeta, i + 1);
                    body.push({
                        type: "TurnStmt",
                        direction: (tokenLower === "\u043b\u0456\u0432\u043e\u0440\u0443\u0447" || tokenLower === "left") ? "left" : "right",
                        angle: parsedExpr.expr,
                        span: this.spanFromMeta(activeTokenMeta, i, parsedExpr.nextIndex),
                    });
                    i = parsedExpr.nextIndex;
                    continue;
                }

                if (tokenLower === "\u043a\u043e\u043b\u0456\u0440" || tokenLower === "color") {
                    if (i + 1 >= tokens.length) throw new RavlykError("NO_COLOR_NAME", token);
                    body.push({
                        type: "ColorStmt",
                        colorName: tokens[i + 1].toLowerCase(),
                        span: this.spanFromMeta(activeTokenMeta, i, i + 2),
                    });
                    i += 2;
                    continue;
                }

                if (tokenLower === "\u043f\u0456\u0434\u043d\u044f\u0442\u0438" || tokenLower === "penup" || tokenLower === "\u043e\u043f\u0443\u0441\u0442\u0438\u0442\u0438" || tokenLower === "pendown") {
                    body.push({
                        type: "PenStmt",
                        mode: (tokenLower === "\u043f\u0456\u0434\u043d\u044f\u0442\u0438" || tokenLower === "penup") ? "up" : "down",
                        span: this.spanFromMeta(activeTokenMeta, i, i + 1),
                    });
                    i += 1;
                    continue;
                }

                if (tokenLower === "\u043e\u0447\u0438\u0441\u0442\u0438\u0442\u0438" || tokenLower === "clear") {
                    body.push({ type: "ClearStmt", span: this.spanFromMeta(activeTokenMeta, i, i + 1) });
                    i += 1;
                    continue;
                }

                if (tokenLower === "\u043f\u0435\u0440\u0435\u0439\u0442\u0438" || tokenLower === "goto") {
                    let xStart = i + 1;
                    const maybePrep = tokens[xStart]?.toLowerCase();
                    if (maybePrep === "\u0432" || maybePrep === "to") {
                        xStart += 1;
                    }
                    const xExpr = this.parseAstExpressionOrThrow(tokens, activeTokenMeta, xStart);
                    let yStart = xExpr.nextIndex;
                    if (tokens[yStart] === ",") yStart += 1;
                    const yExpr = this.parseAstExpressionOrThrow(tokens, activeTokenMeta, yStart);
                    body.push({
                        type: "GotoStmt",
                        x: xExpr.expr,
                        y: yExpr.expr,
                        span: this.spanFromMeta(activeTokenMeta, i, yExpr.nextIndex),
                    });
                    i = yExpr.nextIndex;
                    continue;
                }

                if (tokenLower === "\u043f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0438" || tokenLower === "\u043f\u043e\u0432\u0442\u043e\u0440\u0438" || tokenLower === "repeat") {
                    const countExpr = this.parseAstExpressionOrThrow(tokens, activeTokenMeta, i + 1);
                    if (countExpr.nextIndex >= tokens.length || tokens[countExpr.nextIndex] !== "(") {
                        throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
                    }
                    const parsedBody = this.parseAstBlockOrThrow(tokens, activeTokenMeta, countExpr.nextIndex);
                    body.push({
                        type: "RepeatStmt",
                        count: countExpr.expr,
                        body: parsedBody.body,
                        span: this.spanFromMeta(activeTokenMeta, i, parsedBody.nextIndex),
                    });
                    i = parsedBody.nextIndex;
                    continue;
                }

                if (tokenLower === KEYWORD_IF || tokenLower === "if") {
                    const condition = this.parseAstConditionOrThrow(tokens, activeTokenMeta, i + 1);
                    if (condition.nextIndex >= tokens.length || tokens[condition.nextIndex] !== "(") {
                        throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
                    }
                    const thenBlock = this.parseAstBlockOrThrow(tokens, activeTokenMeta, condition.nextIndex);
                    let nextIndex = thenBlock.nextIndex;
                    let elseBody = [];
                    const maybeElse = tokens[nextIndex]?.toLowerCase();
                    if (maybeElse === KEYWORD_ELSE || maybeElse === "else") {
                        if (nextIndex + 1 >= tokens.length || tokens[nextIndex + 1] !== "(") {
                            throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
                        }
                        const elseBlock = this.parseAstBlockOrThrow(tokens, activeTokenMeta, nextIndex + 1);
                        elseBody = elseBlock.body;
                        nextIndex = elseBlock.nextIndex;
                    }
                    body.push({
                        type: "IfStmt",
                        condition: condition.condition,
                        thenBody: thenBlock.body,
                        elseBody,
                        span: this.spanFromMeta(activeTokenMeta, i, nextIndex),
                    });
                    i = nextIndex;
                    continue;
                }

                if (this.isValidIdentifier(token) && i + 1 < tokens.length && tokens[i + 1] === "=") {
                    const valueExpr = this.parseAstExpressionOrThrow(tokens, activeTokenMeta, i + 2);
                    body.push({
                        type: "AssignmentStmt",
                        name: this.normalizeIdentifier(token),
                        expr: valueExpr.expr,
                        declaredWithCreate: false,
                        span: this.spanFromMeta(activeTokenMeta, i, valueExpr.nextIndex),
                    });
                    i = valueExpr.nextIndex;
                    continue;
                }

                if (this.isValidIdentifier(token) && i + 1 < tokens.length && tokens[i + 1] === "(") {
                    const name = this.normalizeIdentifier(token);
                    const args = [];
                    let argIndex = i + 2;
                    while (argIndex < tokens.length && tokens[argIndex] !== ")") {
                        const parsedArg = this.parseAstExpressionOrThrow(tokens, activeTokenMeta, argIndex);
                        args.push(parsedArg.expr);
                        argIndex = parsedArg.nextIndex;
                        if (tokens[argIndex] === ",") {
                            argIndex += 1;
                        } else if (tokens[argIndex] !== ")") {
                            throw new RavlykError("FUNCTION_CALL_SYNTAX", token);
                        }
                    }
                    if (argIndex >= tokens.length || tokens[argIndex] !== ")") {
                        throw new RavlykError("FUNCTION_CALL_SYNTAX", token);
                    }
                    body.push({
                        type: "FunctionCallStmt",
                        name,
                        args,
                        span: this.spanFromMeta(activeTokenMeta, i, argIndex + 1),
                    });
                    i = argIndex + 1;
                    continue;
                }

                if (token === "(" || token === ")") {
                    throw new RavlykError("UNKNOWN_COMMAND", `${token} (неочікувана дужка)`);
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
