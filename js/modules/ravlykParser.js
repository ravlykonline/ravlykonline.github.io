// js/modules/ravlykParser.js
import {
    ERROR_MESSAGES,
    MAX_PARSE_DEPTH,
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
import {
    attachParserErrorLocation,
    isValidParserIdentifier,
    normalizeParserIdentifier,
    parseQuotedParserStringOrThrow,
    spanFromTokenMeta,
} from './parserCoreUtils.js';
import { createParserStatementContext } from './parserStatementContext.js';
import { validateProgramAst } from './semanticValidator.js';

const COMPARISON_OPERATORS = new Set(["=", "!=", "<", ">", "<=", ">="]);
const KEYWORD_CREATE = "\u0441\u0442\u0432\u043e\u0440\u0438\u0442\u0438";
const KEYWORD_IF = "\u044f\u043a\u0449\u043e";
const KEYWORD_ELSE = "\u0456\u043d\u0430\u043a\u0448\u0435";
const KEYWORD_WHILE = "\u043f\u043e\u043a\u0438";
const KEYWORD_BREAK = "\u0441\u0442\u043e\u043f";
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
        return tokenizeWithMetadata(codeStr, (messageKey, ...params) => new RavlykError(messageKey, ...params));
    }

    attachErrorLocation(error, tokenIndex, tokenMeta) {
        attachParserErrorLocation(error, tokenIndex, tokenMeta);
    }

    normalizeIdentifier(identifier) {
        return normalizeParserIdentifier(identifier);
    }

    isValidIdentifier(identifier) {
        return isValidParserIdentifier(identifier);
    }

    getOperatorPrecedence(operator) {
        return getOperatorPrecedenceHelper(operator);
    }

    parseQuotedStringOrThrow(rawToken) {
        return parseQuotedParserStringOrThrow(rawToken, (token) => new RavlykError("UNKNOWN_COMMAND", token));
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
        return spanFromTokenMeta(tokenMeta, startIndex, endIndexExclusive);
    }

    parseAstExpressionPrimaryOrThrow(tokens, tokenMeta, startIndex, options = {}) {
        return parseAstExpressionOrThrowHelper(tokens, tokenMeta, startIndex, {
            isValidIdentifier: (identifier) => this.isValidIdentifier(identifier),
            normalizeIdentifier: (identifier) => this.normalizeIdentifier(identifier),
            spanFromMeta: (meta, from, to) => this.spanFromMeta(meta, from, to),
            createUnknownCommandError: (token) => new RavlykError("UNKNOWN_COMMAND", token),
            createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
        }, options);
    }

    parseAstExpressionUnaryOrThrow(tokens, tokenMeta, startIndex, options = {}) {
        return this.parseAstExpressionPrimaryOrThrow(tokens, tokenMeta, startIndex, options);
    }

    parseAstExpressionWithPrecedenceOrThrow(tokens, tokenMeta, startIndex, minPrecedence) {
        return this.parseAstExpressionUnaryOrThrow(tokens, tokenMeta, startIndex, { minTopLevelPrecedence: minPrecedence });
    }

    parseAstExpressionOrThrow(tokens, tokenMeta, startIndex) {
        return this.parseAstExpressionWithPrecedenceOrThrow(tokens, tokenMeta, startIndex, 0);
    }

    // Coord expression: для координат перейти в X Y.
    // На верхньому рівні не поглинає + і − (пріоритет 1), щоб `50 -200`
    // читалось як x=50, y=-200, а не як 50-200=-150.
    // Вирази в дужках (50+10) і множення/ділення 50*2 працюють як завжди.
    parseAstCoordExpressionOrThrow(tokens, tokenMeta, startIndex) {
        return this.parseAstExpressionWithPrecedenceOrThrow(tokens, tokenMeta, startIndex, 2);
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

    parseTokensToAst(tokens, depth = 0, substitutions = {}, tokenMeta = null) {
        this._parseDepth = (this._parseDepth || 0) + 1;
        // _parseDepth starts at 1 for the top-level program call; each nested block adds 1.
        // Allow MAX_PARSE_DEPTH nested block levels (top-level = 1, so limit is MAX_PARSE_DEPTH + 1).
        if (this._parseDepth > MAX_PARSE_DEPTH + 1) {
            this._parseDepth--;
            throw new RavlykError("NESTING_TOO_DEEP");
        }
        const activeTokenMeta = tokenMeta || this.lastTokenMeta;
        const statementContext = createParserStatementContext({
            parser: this,
            RavlykErrorCtor: RavlykError,
            keywords: {
                create: KEYWORD_CREATE,
                ifKeyword: KEYWORD_IF,
                elseKeyword: KEYWORD_ELSE,
                whileKeyword: KEYWORD_WHILE,
                breakKeyword: KEYWORD_BREAK,
                game: KEYWORD_GAME,
                backward: KEYWORD_BACKWARD,
                left: KEYWORD_LEFT,
                penUp: KEYWORD_PEN_UP,
                gotoPreposition: KEYWORD_GOTO_PREPOSITION,
            },
        });
        const body = [];
        let i = 0;
        try {
            while (i < tokens.length) {
                try {
                    const parsedStatement = statementContext.parseNextStatementToAst(tokens, activeTokenMeta, i);
                    body.push(parsedStatement.stmt);
                    i = parsedStatement.nextIndex;
                } catch (error) {
                    this.attachErrorLocation(error, i, activeTokenMeta);
                    throw error;
                }
            }
        } finally {
            this._parseDepth--;
        }

        return { type: "Program", body, span: this.spanFromMeta(activeTokenMeta, 0, tokens.length) };
    }

    parseCodeToAst(codeStr) {
        const { tokens, meta } = this.tokenizeWithMetadata(codeStr);
        this.lastTokenMeta = meta;
        const ast = this.parseTokensToAst(tokens, 0, {}, meta);
        return validateProgramAst(ast);
    }
}

export { RavlykError };
