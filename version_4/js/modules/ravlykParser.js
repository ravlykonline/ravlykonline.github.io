// js/modules/ravlykParser.js
import {
    COLOR_MAP, MAX_RECURSION_DEPTH, MAX_REPEATS_IN_LOOP, ERROR_MESSAGES,
} from './constants.js';

const RESERVED_COMMAND_NAMES = new Set([
    "вперед", "forward",
    "назад", "backward",
    "праворуч", "right",
    "ліворуч", "left",
    "колір", "color",
    "підняти", "penup",
    "опустити", "pendown",
    "очистити", "clear",
    "перейти", "goto",
    "повторити", "повтори", "repeat",
    "створити", "create",
]);
const STRICT_NUMBER_REGEX = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const STRICT_INTEGER_REGEX = /^[-+]?\d+$/;
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
        this.userFunctions = {};
        this.userVariables = {};
        this.lastTokenMeta = null;
    }

    resetUserState() {
        this.userFunctions = {};
        this.userVariables = {};
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

    resolveToken(token, substitutions) {
        const normalized = this.normalizeIdentifier(token);
        if (substitutions && Object.prototype.hasOwnProperty.call(substitutions, normalized)) {
            return String(substitutions[normalized]);
        }
        if (Object.prototype.hasOwnProperty.call(this.userVariables, normalized)) {
            return String(this.userVariables[normalized]);
        }
        return token;
    }

    hasBoundValue(token, substitutions) {
        const normalized = this.normalizeIdentifier(token);
        if (substitutions && Object.prototype.hasOwnProperty.call(substitutions, normalized)) {
            return true;
        }
        return Object.prototype.hasOwnProperty.call(this.userVariables, normalized);
    }

    isValidIdentifier(identifier) {
        return /^[\p{L}_][\p{L}\p{N}_-]*$/u.test(identifier);
    }

    parseStrictNumberOrThrow(rawToken, substitutions, errorKey, ...errorParams) {
        const resolved = this.resolveToken(rawToken, substitutions);
        if (STRICT_NUMBER_REGEX.test(resolved)) {
            return { resolved, value: Number(resolved) };
        }
        if (this.isValidIdentifier(rawToken) && !this.hasBoundValue(rawToken, substitutions)) {
            throw new RavlykError("UNDEFINED_VARIABLE", rawToken);
        }
        throw new RavlykError(errorKey, ...errorParams, resolved);
    }

    parseStrictIntegerOrThrow(rawToken, substitutions, errorKey, ...errorParams) {
        const resolved = this.resolveToken(rawToken, substitutions);
        if (STRICT_INTEGER_REGEX.test(resolved)) {
            return { resolved, value: Number(resolved) };
        }
        if (this.isValidIdentifier(rawToken) && !this.hasBoundValue(rawToken, substitutions)) {
            throw new RavlykError("UNDEFINED_VARIABLE", rawToken);
        }
        throw new RavlykError(errorKey, ...errorParams, resolved);
    }

    isArithmeticOperator(token) {
        return token === "+" || token === "-" || token === "*" || token === "/" || token === "%";
    }

    getOperatorPrecedence(operator) {
        if (operator === "+" || operator === "-") return 1;
        if (operator === "*" || operator === "/" || operator === "%") return 2;
        return -1;
    }

    applyArithmeticOperator(leftValue, operator, rightValue, errorKey, ...errorParams) {
        if (operator === "+") return leftValue + rightValue;
        if (operator === "-") return leftValue - rightValue;
        if (operator === "*") return leftValue * rightValue;
        if (operator === "/") {
            if (rightValue === 0) throw new RavlykError(errorKey, ...errorParams);
            return leftValue / rightValue;
        }
        if (operator === "%") {
            if (rightValue === 0) throw new RavlykError(errorKey, ...errorParams);
            return leftValue % rightValue;
        }
        throw new RavlykError(errorKey, ...errorParams);
    }

    parseExpressionPrimaryOrThrow(tokens, startIndex, substitutions, errorKey, ...errorParams) {
        if (startIndex >= tokens.length) {
            throw new RavlykError(errorKey, ...errorParams);
        }

        const token = tokens[startIndex];
        if (token === "(") {
            const inner = this.parseExpressionWithPrecedenceOrThrow(
                tokens,
                startIndex + 1,
                0,
                substitutions,
                errorKey,
                ...errorParams
            );
            if (inner.nextIndex >= tokens.length || tokens[inner.nextIndex] !== ")") {
                throw new RavlykError(errorKey, ...errorParams, inner.resolved);
            }
            return {
                value: inner.value,
                resolved: `(${inner.resolved})`,
                nextIndex: inner.nextIndex + 1,
            };
        }

        const numberToken = this.parseStrictNumberOrThrow(token, substitutions, errorKey, ...errorParams);
        return {
            value: numberToken.value,
            resolved: numberToken.resolved,
            nextIndex: startIndex + 1,
        };
    }

    parseExpressionUnaryOrThrow(tokens, startIndex, substitutions, errorKey, ...errorParams) {
        if (startIndex >= tokens.length) {
            throw new RavlykError(errorKey, ...errorParams);
        }

        const token = tokens[startIndex];
        if (token === "+" || token === "-") {
            const operand = this.parseExpressionUnaryOrThrow(
                tokens,
                startIndex + 1,
                substitutions,
                errorKey,
                ...errorParams
            );
            const value = token === "-" ? -operand.value : operand.value;
            return {
                value,
                resolved: `${token}${operand.resolved}`,
                nextIndex: operand.nextIndex,
            };
        }

        return this.parseExpressionPrimaryOrThrow(tokens, startIndex, substitutions, errorKey, ...errorParams);
    }

    parseExpressionWithPrecedenceOrThrow(tokens, startIndex, minPrecedence, substitutions, errorKey, ...errorParams) {
        let left = this.parseExpressionUnaryOrThrow(tokens, startIndex, substitutions, errorKey, ...errorParams);

        while (left.nextIndex < tokens.length) {
            const operator = tokens[left.nextIndex];
            const precedence = this.getOperatorPrecedence(operator);
            if (precedence < minPrecedence) {
                break;
            }

            const right = this.parseExpressionWithPrecedenceOrThrow(
                tokens,
                left.nextIndex + 1,
                precedence + 1,
                substitutions,
                errorKey,
                ...errorParams
            );

            const expressionText = `${left.resolved} ${operator} ${right.resolved}`;
            const value = this.applyArithmeticOperator(
                left.value,
                operator,
                right.value,
                errorKey,
                ...errorParams,
                expressionText
            );
            if (!Number.isFinite(value)) {
                throw new RavlykError(errorKey, ...errorParams, expressionText);
            }

            left = {
                value,
                resolved: expressionText,
                nextIndex: right.nextIndex,
            };
        }

        return left;
    }

    parseNumberExpressionOrThrow(tokens, startIndex, substitutions, errorKey, ...errorParams) {
        return this.parseExpressionWithPrecedenceOrThrow(
            tokens,
            startIndex,
            0,
            substitutions,
            errorKey,
            ...errorParams
        );
    }

    parseIntegerExpressionOrThrow(tokens, startIndex, substitutions, errorKey, ...errorParams) {
        const expression = this.parseNumberExpressionOrThrow(
            tokens,
            startIndex,
            substitutions,
            errorKey,
            ...errorParams
        );
        if (!Number.isInteger(expression.value)) {
            throw new RavlykError(errorKey, ...errorParams, expression.resolved);
        }
        return expression;
    }

    parseVariableAssignment(tokens, startIndex, substitutions, createdWithKeyword = false) {
        const nameIndex = createdWithKeyword ? startIndex + 1 : startIndex;
        const eqIndex = createdWithKeyword ? startIndex + 2 : startIndex + 1;
        const valueIndex = createdWithKeyword ? startIndex + 3 : startIndex + 2;

        if (valueIndex >= tokens.length || tokens[eqIndex] !== "=") {
            throw new RavlykError("VARIABLE_DECLARATION_SYNTAX");
        }

        const variableName = tokens[nameIndex];
        const variableKey = this.normalizeIdentifier(variableName);

        if (!this.isValidIdentifier(variableName)) {
            throw new RavlykError("VARIABLE_NAME_INVALID", variableName);
        }
        if (RESERVED_COMMAND_NAMES.has(variableKey)) {
            throw new RavlykError("VARIABLE_NAME_RESERVED", variableName);
        }
        if (this.userFunctions[variableKey]) {
            throw new RavlykError("VARIABLE_NAME_CONFLICT_FUNCTION", variableName);
        }

        const parsedValue = this.parseNumberExpressionOrThrow(
            tokens,
            valueIndex,
            substitutions,
            "VARIABLE_VALUE_INVALID",
            variableName
        );
        this.userVariables[variableKey] = parsedValue.value;
        return parsedValue.nextIndex;
    }

    parseCreateStatement(tokens, startIndex, substitutions, tokenMeta = null) {
        if (startIndex + 2 >= tokens.length) {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }

        if (tokens[startIndex + 2] === "=") {
            return this.parseVariableAssignment(tokens, startIndex, substitutions, true);
        }
        if (tokens[startIndex + 2] === "(") {
            return this.parseFunctionDeclaration(tokens, startIndex, tokenMeta);
        }
        throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
    }

    parseFunctionDeclaration(tokens, startIndex, tokenMeta = null) {
        if (startIndex + 5 >= tokens.length) {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }

        const functionName = tokens[startIndex + 1];
        const nameLower = this.normalizeIdentifier(functionName);
        if (!this.isValidIdentifier(functionName)) {
            throw new RavlykError("FUNCTION_NAME_INVALID", functionName);
        }
        if (RESERVED_COMMAND_NAMES.has(nameLower)) {
            throw new RavlykError("FUNCTION_NAME_RESERVED", functionName);
        }
        if (Object.prototype.hasOwnProperty.call(this.userVariables, nameLower)) {
            throw new RavlykError("FUNCTION_NAME_CONFLICT_VARIABLE", functionName);
        }
        if (this.userFunctions[nameLower]) {
            throw new RavlykError("FUNCTION_ALREADY_EXISTS", functionName);
        }

        if (tokens[startIndex + 2] !== "(") {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }
        const paramName = tokens[startIndex + 3];
        if (!this.isValidIdentifier(paramName)) {
            throw new RavlykError("FUNCTION_PARAM_INVALID", paramName);
        }
        if (RESERVED_COMMAND_NAMES.has(this.normalizeIdentifier(paramName))) {
            throw new RavlykError("FUNCTION_PARAM_RESERVED", paramName);
        }
        if (tokens[startIndex + 4] !== ")") {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }
        if (tokens[startIndex + 5] !== "(") {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }

        let parenBalance = 1;
        let bodyStart = startIndex + 6;
        let bodyEnd = bodyStart;
        while (bodyEnd < tokens.length) {
            if (tokens[bodyEnd] === "(") parenBalance++;
            else if (tokens[bodyEnd] === ")") parenBalance--;
            if (parenBalance === 0) break;
            bodyEnd++;
        }

        if (parenBalance !== 0) {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }

        const bodyTokens = tokens.slice(bodyStart, bodyEnd);
        const bodyTokenMeta = tokenMeta ? tokenMeta.slice(bodyStart, bodyEnd) : null;
        if (bodyTokens.length === 0) {
            throw new RavlykError("FUNCTION_BODY_EMPTY", functionName);
        }

        this.userFunctions[nameLower] = {
            name: functionName,
            paramName: this.normalizeIdentifier(paramName),
            bodyTokens,
            bodyTokenMeta,
        };

        return bodyEnd + 1;
    }

    tryParseFunctionCall(tokens, startIndex, depth, substitutions) {
        const functionName = tokens[startIndex];
        const nameLower = this.normalizeIdentifier(functionName);
        const functionDef = this.userFunctions[nameLower];
        if (!functionDef) return null;

        if (startIndex + 2 >= tokens.length || tokens[startIndex + 1] !== "(") {
            throw new RavlykError("FUNCTION_CALL_SYNTAX", functionName);
        }

        const parsedArgument = this.parseNumberExpressionOrThrow(
            tokens,
            startIndex + 2,
            substitutions,
            "FUNCTION_ARGUMENT_INVALID",
            functionName
        );
        if (parsedArgument.nextIndex >= tokens.length || tokens[parsedArgument.nextIndex] !== ")") {
            throw new RavlykError("FUNCTION_CALL_SYNTAX", functionName);
        }
        const localSubstitutions = { ...substitutions, [functionDef.paramName]: parsedArgument.value };
        const expandedCommands = this.parseTokens(
            functionDef.bodyTokens,
            depth + 1,
            localSubstitutions,
            functionDef.bodyTokenMeta || null
        );

        return {
            commands: expandedCommands,
            nextIndex: parsedArgument.nextIndex + 1,
        };
    }

    parseMoveCommand(tokens, startIndex, token, originalToken, substitutions, queue) {
        if (startIndex + 1 >= tokens.length) throw new RavlykError("NO_DISTANCE", originalToken);
        const distanceToken = this.parseNumberExpressionOrThrow(
            tokens,
            startIndex + 1,
            substitutions,
            "INVALID_DISTANCE",
            originalToken
        );
        queue.push({
            type: (token === "вперед" || token === "forward") ? "MOVE" : "MOVE_BACK",
            value: distanceToken.value,
            original: `${originalToken} ${distanceToken.resolved}`
        });
        return distanceToken.nextIndex;
    }

    parseTurnCommand(tokens, startIndex, token, originalToken, substitutions, queue) {
        if (startIndex + 1 >= tokens.length) throw new RavlykError("NO_ANGLE", originalToken);
        const angleToken = this.parseNumberExpressionOrThrow(
            tokens,
            startIndex + 1,
            substitutions,
            "INVALID_ANGLE",
            originalToken
        );
        queue.push({
            type: (token === "праворуч" || token === "right") ? "TURN" : "TURN_LEFT",
            value: angleToken.value,
            original: `${originalToken} ${angleToken.resolved}`
        });
        return angleToken.nextIndex;
    }

    parseColorCommand(tokens, startIndex, originalToken, queue) {
        if (startIndex + 1 >= tokens.length) throw new RavlykError("NO_COLOR_NAME", originalToken);
        const colorName = tokens[startIndex + 1].toLowerCase();
        if (!COLOR_MAP[colorName]) throw new RavlykError("UNKNOWN_COLOR", tokens[startIndex + 1]);
        queue.push({
            type: "COLOR",
            value: colorName,
            original: `${originalToken} ${tokens[startIndex + 1]}`
        });
        return startIndex + 2;
    }

    parseGotoCommand(tokens, startIndex, originalToken, substitutions, queue) {
        let xIndex = startIndex + 1;
        const maybePreposition = tokens[xIndex]?.toLowerCase();
        if (maybePreposition === "в" || maybePreposition === "to") {
            xIndex++;
        }

        if (xIndex >= tokens.length) throw new RavlykError("NO_POSITION_X", originalToken);

        let commaIndex = -1;
        let parenDepth = 0;
        for (let i = xIndex; i < tokens.length; i++) {
            if (tokens[i] === "(") {
                parenDepth++;
                continue;
            }
            if (tokens[i] === ")") {
                if (parenDepth === 0) break;
                parenDepth--;
                continue;
            }
            if (tokens[i] === "," && parenDepth === 0) {
                commaIndex = i;
                break;
            }
        }

        let xToken;
        if (commaIndex !== -1) {
            xToken = this.parseNumberExpressionOrThrow(
                tokens,
                xIndex,
                substitutions,
                "INVALID_POSITION_X",
                originalToken
            );
            if (xToken.nextIndex !== commaIndex) {
                throw new RavlykError("INVALID_POSITION_X", originalToken, xToken.resolved);
            }
        } else {
            // Without comma, parse X as a single unary/parenthesized value to avoid ambiguity with Y.
            xToken = this.parseExpressionUnaryOrThrow(
                tokens,
                xIndex,
                substitutions,
                "INVALID_POSITION_X",
                originalToken
            );
        }

        if (xToken.nextIndex >= tokens.length) throw new RavlykError("NO_POSITION_Y", originalToken);
        const yStartIndex = tokens[xToken.nextIndex] === "," ? xToken.nextIndex + 1 : xToken.nextIndex;
        if (yStartIndex >= tokens.length) throw new RavlykError("NO_POSITION_Y", originalToken);
        const yToken = this.parseNumberExpressionOrThrow(
            tokens,
            yStartIndex,
            substitutions,
            "INVALID_POSITION_Y",
            originalToken
        );

        queue.push({
            type: "GOTO",
            x: xToken.value,
            y: yToken.value,
            original: `${originalToken} ${xToken.resolved} ${yToken.resolved}`
        });

        return yToken.nextIndex;
    }

    parseSimpleCommand(startIndex, type, originalToken, queue) {
        queue.push({ type, original: originalToken });
        return startIndex + 1;
    }

    parseQuotedStringOrThrow(rawToken) {
        if (typeof rawToken !== "string" || rawToken.length < 2 || rawToken[0] !== '"' || rawToken[rawToken.length - 1] !== '"') {
            throw new RavlykError("UNKNOWN_COMMAND", rawToken);
        }
        return rawToken.slice(1, -1);
    }

    parseExpressionFromSliceOrThrow(tokens, substitutions, errorKey, ...errorParams) {
        if (!Array.isArray(tokens) || tokens.length === 0) {
            throw new RavlykError(errorKey, ...errorParams);
        }
        const parsed = this.parseNumberExpressionOrThrow(tokens, 0, substitutions, errorKey, ...errorParams);
        if (parsed.nextIndex !== tokens.length) {
            throw new RavlykError(errorKey, ...errorParams, parsed.resolved);
        }
        return parsed;
    }

    parseIfConditionOrThrow(conditionTokens, substitutions) {
        if (!conditionTokens || conditionTokens.length === 0) {
            throw new RavlykError("UNKNOWN_COMMAND", KEYWORD_IF);
        }

        const firstTokenLower = conditionTokens[0].toLowerCase();
        if (firstTokenLower === KEYWORD_EDGE || firstTokenLower === "edge") {
            if (conditionTokens.length !== 1) {
                throw new RavlykError("UNKNOWN_COMMAND", conditionTokens.join(" "));
            }
            return { type: "EDGE" };
        }

        if (firstTokenLower === KEYWORD_KEY || firstTokenLower === "key") {
            if (conditionTokens.length !== 2) {
                throw new RavlykError("UNKNOWN_COMMAND", conditionTokens.join(" "));
            }
            const keyValue = this.parseQuotedStringOrThrow(conditionTokens[1]).toLowerCase();
            return { type: "KEY", key: keyValue };
        }

        let comparatorIndex = -1;
        for (let i = 0; i < conditionTokens.length; i++) {
            if (COMPARISON_OPERATORS.has(conditionTokens[i])) {
                comparatorIndex = i;
                break;
            }
        }
        if (comparatorIndex <= 0 || comparatorIndex >= conditionTokens.length - 1) {
            throw new RavlykError("UNKNOWN_COMMAND", conditionTokens.join(" "));
        }

        const operator = conditionTokens[comparatorIndex];
        const leftTokens = conditionTokens.slice(0, comparatorIndex);
        const rightTokens = conditionTokens.slice(comparatorIndex + 1);
        const leftExpr = this.parseExpressionFromSliceOrThrow(leftTokens, substitutions, "INVALID_DISTANCE", KEYWORD_IF);
        const rightExpr = this.parseExpressionFromSliceOrThrow(rightTokens, substitutions, "INVALID_DISTANCE", KEYWORD_IF);
        return {
            type: "COMPARE",
            operator,
            left: leftExpr.value,
            right: rightExpr.value,
        };
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

    parseIfCommand(tokens, startIndex, originalToken, depth, substitutions, queue, tokenMeta = null) {
        if (startIndex + 1 >= tokens.length) {
            throw new RavlykError("UNKNOWN_COMMAND", originalToken);
        }

        let openParenIndex = -1;
        let condition = null;
        for (let i = startIndex + 1; i < tokens.length; i++) {
            if (tokens[i] !== "(") continue;
            const maybeConditionTokens = tokens.slice(startIndex + 1, i);
            try {
                condition = this.parseIfConditionOrThrow(maybeConditionTokens, substitutions);
                openParenIndex = i;
                break;
            } catch (error) {
                // Keep scanning; this "(" may belong to a parenthesized expression in the condition.
            }
        }
        if (openParenIndex === -1 || !condition) {
            throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
        }

        const thenCloseParenIndex = this.findClosingParenIndex(tokens, openParenIndex);
        if (thenCloseParenIndex === -1) {
            throw new RavlykError("REPEAT_EXPECT_CLOSE_PAREN");
        }

        const thenTokens = tokens.slice(openParenIndex + 1, thenCloseParenIndex);
        const thenTokenMeta = tokenMeta ? tokenMeta.slice(openParenIndex + 1, thenCloseParenIndex) : null;
        const thenCommands = this.parseTokens(thenTokens, depth + 1, substitutions, thenTokenMeta);

        let nextIndex = thenCloseParenIndex + 1;
        let elseCommands = [];
        const maybeElseToken = tokens[nextIndex]?.toLowerCase();
        if (maybeElseToken === KEYWORD_ELSE || maybeElseToken === "else") {
            if (nextIndex + 1 >= tokens.length || tokens[nextIndex + 1] !== "(") {
                throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
            }
            const elseOpenParenIndex = nextIndex + 1;
            const elseCloseParenIndex = this.findClosingParenIndex(tokens, elseOpenParenIndex);
            if (elseCloseParenIndex === -1) {
                throw new RavlykError("REPEAT_EXPECT_CLOSE_PAREN");
            }
            const elseTokens = tokens.slice(elseOpenParenIndex + 1, elseCloseParenIndex);
            const elseTokenMeta = tokenMeta ? tokenMeta.slice(elseOpenParenIndex + 1, elseCloseParenIndex) : null;
            elseCommands = this.parseTokens(elseTokens, depth + 1, substitutions, elseTokenMeta);
            nextIndex = elseCloseParenIndex + 1;
        }

        queue.push({
            type: "IF",
            condition,
            thenCommands,
            elseCommands,
            original: originalToken,
        });
        return nextIndex;
    }

    parseRepeatCommand(tokens, startIndex, originalToken, depth, substitutions, queue, tokenMeta = null) {
        if (startIndex + 1 >= tokens.length) throw new RavlykError("REPEAT_EXPECT_NUMBER");
        const repeatCountToken = this.parseIntegerExpressionOrThrow(
            tokens,
            startIndex + 1,
            substitutions,
            "INVALID_REPEAT_COUNT"
        );
        const repeatCount = repeatCountToken.value;
        if (repeatCount < 0) throw new RavlykError("INVALID_REPEAT_COUNT", repeatCountToken.resolved);
        if (repeatCount > MAX_REPEATS_IN_LOOP) {
            console.warn(`Warning: Repeat count ${repeatCount} exceeds maximum ${MAX_REPEATS_IN_LOOP}. Clamping to max.`);
        }
        const actualRepeatCount = Math.min(repeatCount, MAX_REPEATS_IN_LOOP);

        if (repeatCountToken.nextIndex >= tokens.length || tokens[repeatCountToken.nextIndex] !== "(") {
            throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
        }

        let parenBalance = 1;
        const subTokensStart = repeatCountToken.nextIndex + 1;
        let subTokensEnd = subTokensStart;
        while (subTokensEnd < tokens.length) {
            if (tokens[subTokensEnd] === "(") parenBalance++;
            else if (tokens[subTokensEnd] === ")") parenBalance--;
            if (parenBalance === 0) break;
            subTokensEnd++;
        }

        if (parenBalance !== 0) {
            throw new RavlykError("REPEAT_EXPECT_CLOSE_PAREN");
        }

        const commandsToRepeatTokens = tokens.slice(subTokensStart, subTokensEnd);
        const nestedTokenMeta = tokenMeta ? tokenMeta.slice(subTokensStart, subTokensEnd) : null;

        // When loop body mutates variables, expand iterations at parse time
        // so expressions like "вперед крок" see updated values each iteration.
        const hasAssignmentInBody = commandsToRepeatTokens.includes("=");
        if (hasAssignmentInBody) {
            for (let iteration = 0; iteration < actualRepeatCount; iteration++) {
                const iterationCommands = this.parseTokens(
                    commandsToRepeatTokens,
                    depth + 1,
                    substitutions,
                    nestedTokenMeta
                );
                if (iterationCommands.length > 0) {
                    queue.push(...iterationCommands);
                }
            }
            return subTokensEnd + 1;
        }

        const nestedCommands = this.parseTokens(commandsToRepeatTokens, depth + 1, substitutions, nestedTokenMeta);
        if (actualRepeatCount > 0 && nestedCommands.length > 0) {
            queue.push({
                type: "REPEAT",
                count: actualRepeatCount,
                commands: nestedCommands,
                original: `${originalToken} ${repeatCountToken.resolved} (...)`
            });
        }

        return subTokensEnd + 1;
    }

    parseDefaultCommand(tokens, startIndex, depth, substitutions, queue, originalToken) {
        if (this.isValidIdentifier(originalToken) && startIndex + 1 < tokens.length && tokens[startIndex + 1] === "=") {
            return this.parseVariableAssignment(tokens, startIndex, substitutions, false);
        }

        const functionCall = this.tryParseFunctionCall(tokens, startIndex, depth, substitutions);
        if (functionCall) {
            queue.push(...functionCall.commands);
            return functionCall.nextIndex;
        }

        throw new RavlykError("UNKNOWN_COMMAND", originalToken);
    }

    parseTokens(tokens, depth = 0, substitutions = {}, tokenMeta = null) {
        if (depth > MAX_RECURSION_DEPTH) {
            throw new RavlykError("TOO_MANY_NESTED_REPEATS");
        }
        const activeTokenMeta = tokenMeta || this.lastTokenMeta;

        const keywordHandlers = {
            "створити": (i, original, queue) => this.parseCreateStatement(tokens, i, substitutions, activeTokenMeta),
            "create": (i, original, queue) => this.parseCreateStatement(tokens, i, substitutions, activeTokenMeta),
            "вперед": (i, original, queue) => this.parseMoveCommand(tokens, i, "вперед", original, substitutions, queue),
            "forward": (i, original, queue) => this.parseMoveCommand(tokens, i, "forward", original, substitutions, queue),
            "назад": (i, original, queue) => this.parseMoveCommand(tokens, i, "назад", original, substitutions, queue),
            "backward": (i, original, queue) => this.parseMoveCommand(tokens, i, "backward", original, substitutions, queue),
            "праворуч": (i, original, queue) => this.parseTurnCommand(tokens, i, "праворуч", original, substitutions, queue),
            "right": (i, original, queue) => this.parseTurnCommand(tokens, i, "right", original, substitutions, queue),
            "ліворуч": (i, original, queue) => this.parseTurnCommand(tokens, i, "ліворуч", original, substitutions, queue),
            "left": (i, original, queue) => this.parseTurnCommand(tokens, i, "left", original, substitutions, queue),
            "колір": (i, original, queue) => this.parseColorCommand(tokens, i, original, queue),
            "color": (i, original, queue) => this.parseColorCommand(tokens, i, original, queue),
            "перейти": (i, original, queue) => this.parseGotoCommand(tokens, i, original, substitutions, queue),
            "goto": (i, original, queue) => this.parseGotoCommand(tokens, i, original, substitutions, queue),
            "підняти": (i, original, queue) => this.parseSimpleCommand(i, "PEN_UP", original, queue),
            "penup": (i, original, queue) => this.parseSimpleCommand(i, "PEN_UP", original, queue),
            "опустити": (i, original, queue) => this.parseSimpleCommand(i, "PEN_DOWN", original, queue),
            "pendown": (i, original, queue) => this.parseSimpleCommand(i, "PEN_DOWN", original, queue),
            "очистити": (i, original, queue) => this.parseSimpleCommand(i, "CLEAR", original, queue),
            "clear": (i, original, queue) => this.parseSimpleCommand(i, "CLEAR", original, queue),
            "повторити": (i, original, queue) => this.parseRepeatCommand(tokens, i, original, depth, substitutions, queue, activeTokenMeta),
            "повтори": (i, original, queue) => this.parseRepeatCommand(tokens, i, original, depth, substitutions, queue, activeTokenMeta),
            "repeat": (i, original, queue) => this.parseRepeatCommand(tokens, i, original, depth, substitutions, queue, activeTokenMeta),
            "if": (i, original, queue) => this.parseIfCommand(tokens, i, original, depth, substitutions, queue, activeTokenMeta),
        };
        keywordHandlers[KEYWORD_IF] = (i, original, queue) => this.parseIfCommand(tokens, i, original, depth, substitutions, queue, activeTokenMeta);

        const queue = [];
        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i].toLowerCase();
            const originalToken = tokens[i];

            try {
                const handler = keywordHandlers[token];
                if (handler) {
                    i = handler(i, originalToken, queue);
                    continue;
                }
                if (token === "(" || token === ")") {
                    throw new RavlykError("UNKNOWN_COMMAND", `${originalToken} (неочікувана дужка)`);
                }
                i = this.parseDefaultCommand(tokens, i, depth, substitutions, queue, originalToken);
            } catch (error) {
                this.attachErrorLocation(error, i, activeTokenMeta);
                throw error;
            }
        }
        return queue;
    }

    spanFromMeta(tokenMeta, startIndex, endExclusive) {
        if (!tokenMeta || !tokenMeta.length) return null;
        const safeStart = Math.max(0, Math.min(startIndex, tokenMeta.length - 1));
        const safeEnd = Math.max(safeStart, Math.min(endExclusive - 1, tokenMeta.length - 1));
        const start = tokenMeta[safeStart];
        const end = tokenMeta[safeEnd];
        if (!start || !end) return null;
        return {
            start: { line: start.line, column: start.column, token: start.token },
            end: { line: end.line, column: end.column, token: end.token },
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

