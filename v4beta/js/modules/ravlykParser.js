// js/modules/ravlykParser.js
import {
    ERROR_MESSAGES,
} from './constants.js';

const STRICT_NUMBER_REGEX = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
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
        const tokens = [];
        const meta = [];
        const lines = String(codeStr ?? "").split(/\r?\n/);

        for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
            const sourceLine = lines[lineIndex];
            const commentIndex = sourceLine.indexOf('#');
            const lineWithoutComment = commentIndex >= 0 ? sourceLine.slice(0, commentIndex) : sourceLine;
            const tokenRegex = /"[^"\r\n]*"|>=|<=|!=|[(),=<>+\-*/%]|[^\s(),=<>+\-*/%"]+/g;

            let match;
            while ((match = tokenRegex.exec(lineWithoutComment)) !== null) {
                const value = match[0];
                if (!value.trim()) continue;
                tokens.push(value);
                meta.push({
                    line: lineIndex + 1,
                    column: match.index + 1,
                    token: value,
                });
            }
        }

        return { tokens, meta };
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
        if (operator === "+" || operator === "-") return 1;
        if (operator === "*" || operator === "/" || operator === "%") return 2;
        return -1;
    }
















    parseQuotedStringOrThrow(rawToken) {
        if (typeof rawToken !== "string" || rawToken.length < 2 || rawToken[0] !== '"' || rawToken[rawToken.length - 1] !== '"') {
            throw new RavlykError("UNKNOWN_COMMAND", rawToken);
        }
        return rawToken.slice(1, -1);
    }



    findClosingParenIndex(tokens, openParenIndex) {
        if (openParenIndex < 0 || openParenIndex >= tokens.length || tokens[openParenIndex] !== "(") {
            return -1;
        }
        let parenBalance = 1;
        for (let i = openParenIndex + 1; i < tokens.length; i++) {
            if (tokens[i] === "(") parenBalance++;
            else if (tokens[i] === ")") parenBalance--;
            if (parenBalance === 0) return i;
        }
        return -1;
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
        if (startIndex >= tokens.length) throw new RavlykError("UNKNOWN_COMMAND", "expression");
        const token = tokens[startIndex];
        if (token === "(") {
            const inner = this.parseAstExpressionWithPrecedenceOrThrow(tokens, tokenMeta, startIndex + 1, 0);
            if (inner.nextIndex >= tokens.length || tokens[inner.nextIndex] !== ")") {
                throw new RavlykError("UNKNOWN_COMMAND", token);
            }
            return {
                expr: { ...inner.expr, span: this.spanFromMeta(tokenMeta, startIndex, inner.nextIndex + 1) || inner.expr.span || null },
                nextIndex: inner.nextIndex + 1,
                startIndex,
            };
        }
        if (STRICT_NUMBER_REGEX.test(token)) {
            return {
                expr: { type: "NumberLiteral", value: Number(token), span: this.spanFromMeta(tokenMeta, startIndex, startIndex + 1) },
                nextIndex: startIndex + 1,
                startIndex,
            };
        }
        if (this.isValidIdentifier(token)) {
            return {
                expr: { type: "Identifier", name: this.normalizeIdentifier(token), span: this.spanFromMeta(tokenMeta, startIndex, startIndex + 1) },
                nextIndex: startIndex + 1,
                startIndex,
            };
        }
        throw new RavlykError("UNKNOWN_COMMAND", token);
    }

    parseAstExpressionUnaryOrThrow(tokens, tokenMeta, startIndex) {
        if (startIndex >= tokens.length) throw new RavlykError("UNKNOWN_COMMAND", "expression");
        const token = tokens[startIndex];
        if (token === "+" || token === "-") {
            const operand = this.parseAstExpressionUnaryOrThrow(tokens, tokenMeta, startIndex + 1);
            return {
                expr: {
                    type: "UnaryExpr",
                    op: token,
                    expr: operand.expr,
                    span: this.spanFromMeta(tokenMeta, startIndex, operand.nextIndex),
                },
                nextIndex: operand.nextIndex,
                startIndex,
            };
        }
        return this.parseAstExpressionPrimaryOrThrow(tokens, tokenMeta, startIndex);
    }

    parseAstExpressionWithPrecedenceOrThrow(tokens, tokenMeta, startIndex, minPrecedence) {
        let left = this.parseAstExpressionUnaryOrThrow(tokens, tokenMeta, startIndex);
        while (left.nextIndex < tokens.length) {
            const operator = tokens[left.nextIndex];
            const precedence = this.getOperatorPrecedence(operator);
            if (precedence < minPrecedence) break;
            const right = this.parseAstExpressionWithPrecedenceOrThrow(tokens, tokenMeta, left.nextIndex + 1, precedence + 1);
            left = {
                expr: {
                    type: "BinaryExpr",
                    op: operator,
                    left: left.expr,
                    right: right.expr,
                    span: this.spanFromMeta(tokenMeta, left.startIndex, right.nextIndex),
                },
                nextIndex: right.nextIndex,
                startIndex: left.startIndex,
            };
        }
        return left;
    }

    parseAstExpressionOrThrow(tokens, tokenMeta, startIndex) {
        return this.parseAstExpressionWithPrecedenceOrThrow(tokens, tokenMeta, startIndex, 0);
    }

    parseAstBlockOrThrow(tokens, tokenMeta, openParenIndex) {
        if (openParenIndex >= tokens.length || tokens[openParenIndex] !== "(") throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
        const closeParenIndex = this.findClosingParenIndex(tokens, openParenIndex);
        if (closeParenIndex === -1) throw new RavlykError("REPEAT_EXPECT_CLOSE_PAREN");
        const innerTokens = tokens.slice(openParenIndex + 1, closeParenIndex);
        const innerMeta = tokenMeta ? tokenMeta.slice(openParenIndex + 1, closeParenIndex) : null;
        const body = this.parseTokensToAst(innerTokens, 0, {}, innerMeta).body;
        return { body, nextIndex: closeParenIndex + 1, span: this.spanFromMeta(tokenMeta, openParenIndex, closeParenIndex + 1) };
    }

    parseAstConditionOrThrow(tokens, tokenMeta, startIndex) {
        if (startIndex >= tokens.length) throw new RavlykError("UNKNOWN_COMMAND", KEYWORD_IF);
        const firstLower = tokens[startIndex].toLowerCase();
        if (firstLower === KEYWORD_EDGE || firstLower === "edge") {
            return {
                condition: { type: "EdgeCondition", span: this.spanFromMeta(tokenMeta, startIndex, startIndex + 1) },
                nextIndex: startIndex + 1,
            };
        }
        if (firstLower === KEYWORD_KEY || firstLower === "key") {
            const keyToken = tokens[startIndex + 1];
            const keyValue = this.parseQuotedStringOrThrow(keyToken).toLowerCase();
            return {
                condition: { type: "KeyCondition", key: keyValue, span: this.spanFromMeta(tokenMeta, startIndex, startIndex + 2) },
                nextIndex: startIndex + 2,
            };
        }
        const left = this.parseAstExpressionOrThrow(tokens, tokenMeta, startIndex);
        const operator = tokens[left.nextIndex];
        if (!COMPARISON_OPERATORS.has(operator)) throw new RavlykError("UNKNOWN_COMMAND", operator || KEYWORD_IF);
        const right = this.parseAstExpressionOrThrow(tokens, tokenMeta, left.nextIndex + 1);
        return {
            condition: {
                type: "CompareCondition",
                op: operator,
                left: left.expr,
                right: right.expr,
                span: this.spanFromMeta(tokenMeta, startIndex, right.nextIndex),
            },
            nextIndex: right.nextIndex,
        };
    }

    parseCreateStatementToAst(tokens, tokenMeta, startIndex) {
        if (startIndex + 2 >= tokens.length) {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }
        const name = tokens[startIndex + 1];
        if (!this.isValidIdentifier(name)) {
            throw new RavlykError("FUNCTION_NAME_INVALID", name);
        }

        if (tokens[startIndex + 2] === "=") {
            const valueExpr = this.parseAstExpressionOrThrow(tokens, tokenMeta, startIndex + 3);
            return {
                stmt: {
                    type: "AssignmentStmt",
                    name: this.normalizeIdentifier(name),
                    expr: valueExpr.expr,
                    declaredWithCreate: true,
                    span: this.spanFromMeta(tokenMeta, startIndex, valueExpr.nextIndex),
                },
                nextIndex: valueExpr.nextIndex,
            };
        }

        if (tokens[startIndex + 2] === "(") {
            const params = [];
            let i = startIndex + 3;
            while (i < tokens.length && tokens[i] !== ")") {
                const param = tokens[i];
                if (!this.isValidIdentifier(param)) {
                    throw new RavlykError("FUNCTION_PARAM_INVALID", param);
                }
                params.push(this.normalizeIdentifier(param));
                i++;
                if (tokens[i] === ",") {
                    i++;
                } else if (tokens[i] !== ")") {
                    throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
                }
            }
            if (i >= tokens.length || tokens[i] !== ")") {
                throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
            }
            if (i + 1 >= tokens.length || tokens[i + 1] !== "(") {
                throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
            }
            const parsedBody = this.parseAstBlockOrThrow(tokens, tokenMeta, i + 1);
            return {
                stmt: {
                    type: "FunctionDefStmt",
                    name: this.normalizeIdentifier(name),
                    params,
                    body: parsedBody.body,
                    span: this.spanFromMeta(tokenMeta, startIndex, parsedBody.nextIndex),
                },
                nextIndex: parsedBody.nextIndex,
            };
        }

        throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
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

