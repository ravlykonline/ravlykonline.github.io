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
            const tokenRegex = /[(),=]|[^\s(),=]+/g;

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
        return token === "+" || token === "-" || token === "*" || token === "/";
    }

    getOperatorPrecedence(operator) {
        if (operator === "+" || operator === "-") return 1;
        if (operator === "*" || operator === "/") return 2;
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
        };

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
}

export { RavlykError };

