import assert from 'node:assert/strict';
import {
    findClosingParenIndex,
    parseAstBlockOrThrow,
    parseAstConditionOrThrow,
} from '../js/modules/parserBlocksConditions.js';
import { parseCreateStatementToAst } from '../js/modules/parserCreateStatement.js';
import {
    attachParserErrorLocation,
    isValidParserIdentifier,
    normalizeParserIdentifier,
    parseQuotedParserStringOrThrow,
    spanFromTokenMeta,
} from '../js/modules/parserCoreUtils.js';
import { parseMoveStatementToAst } from '../js/modules/parserMotionStatements.js';
import { parseNextStatementToAst } from '../js/modules/parserStatementDispatcher.js';
import { createParserStatementContext } from '../js/modules/parserStatementContext.js';
import { createParserStatementHandlers } from '../js/modules/parserStatementHandlers.js';
import { parseFunctionCallStatementToAst } from '../js/modules/parserStateStatements.js';
import { runTest } from './testUtils.js';

runTest('parser block/condition helpers parse nested parens and if-comparison condition', () => {
    assert.equal(findClosingParenIndex(['(', 'a', '(', 'b', ')', ')'], 0), 5);

    const block = parseAstBlockOrThrow({
        tokens: ['(', 'cmd', ')'],
        tokenMeta: null,
        openParenIndex: 0,
        findClosingParenIndexFn: findClosingParenIndex,
        parseTokensToAst: (innerTokens) => ({ body: innerTokens.map((token) => ({ token })) }),
        spanFromMeta: () => null,
        createError: (code) => new Error(code),
    });
    assert.equal(block.nextIndex, 3);
    assert.deepEqual(block.body, [{ token: 'cmd' }]);

    const condition = parseAstConditionOrThrow({
        tokens: ['left', '>=', 'right'],
        tokenMeta: null,
        startIndex: 0,
        keywordIf: 'if',
        keywordEdge: 'edge',
        keywordKey: 'key',
        comparisonOperators: new Set(['>=']),
        parseQuotedStringOrThrow: (raw) => raw.replaceAll('"', ''),
        parseAstExpressionOrThrow: (tokensInput, _meta, start) => ({
            expr: { type: 'Identifier', name: tokensInput[start] },
            nextIndex: start + 1,
        }),
        spanFromMeta: () => null,
        createUnknownCommandError: (token) => new Error(`unknown:${token}`),
    });
    assert.equal(condition.nextIndex, 3);
    assert.equal(condition.condition.type, 'CompareCondition');
    assert.equal(condition.condition.op, '>=');
});

runTest('parser create-statement helper parses create assignment path', () => {
    const parsed = parseCreateStatementToAst({
        tokens: ['create', 'score', '=', '10'],
        tokenMeta: null,
        startIndex: 0,
        isValidIdentifier: (identifier) => /^[a-z]+$/i.test(identifier),
        normalizeIdentifier: (identifier) => String(identifier).toLowerCase(),
        parseAstExpressionOrThrow: (_tokens, _meta, _startIndex) => ({
            expr: { type: 'NumberLiteral', value: 10 },
            nextIndex: 4,
        }),
        parseAstBlockOrThrow: () => ({ body: [], nextIndex: 0 }),
        spanFromMeta: () => null,
        createError: (code) => new Error(code),
    });

    assert.equal(parsed.nextIndex, 4);
    assert.equal(parsed.stmt.type, 'AssignmentStmt');
    assert.equal(parsed.stmt.name, 'score');
    assert.equal(parsed.stmt.declaredWithCreate, true);
});

runTest('parser motion/state statement helpers keep move and function-call contracts', () => {
    const move = parseMoveStatementToAst({
        tokens: ['forward', '10'],
        tokenMeta: null,
        startIndex: 0,
        tokenLower: 'forward',
        parseAstExpressionOrThrow: () => ({
            expr: { type: 'NumberLiteral', value: 10 },
            nextIndex: 2,
        }),
        spanFromMeta: () => null,
        backwardKeyword: 'backward',
    });
    assert.equal(move.stmt.type, 'MoveStmt');
    assert.equal(move.stmt.direction, 'forward');
    assert.equal(move.nextIndex, 2);

    const fnCall = parseFunctionCallStatementToAst({
        tokens: ['sum', '(', '1', ',', '2', ')'],
        tokenMeta: null,
        startIndex: 0,
        parseAstExpressionOrThrow: (tokensInput, _meta, index) => ({
            expr: { type: 'NumberLiteral', value: Number(tokensInput[index]) },
            nextIndex: index + 1,
        }),
        normalizeIdentifier: (identifier) => String(identifier).toLowerCase(),
        spanFromMeta: () => null,
        createError: (code, token) => new Error(`${code}:${token}`),
    });
    assert.equal(fnCall.stmt.type, 'FunctionCallStmt');
    assert.equal(fnCall.stmt.name, 'sum');
    assert.equal(fnCall.stmt.args.length, 2);
    assert.equal(fnCall.nextIndex, 6);
});

runTest('parser core utils handle identifiers, quoted strings, spans, and error locations', () => {
    assert.equal(normalizeParserIdentifier('Score'), 'score');
    assert.equal(isValidParserIdentifier('\u0457\u0436\u0430_1'), true);
    assert.equal(isValidParserIdentifier('1bad'), false);
    assert.equal(
        parseQuotedParserStringOrThrow('"space key"', (token) => new Error(`unknown:${token}`)),
        'space key'
    );
    assert.throws(
        () => parseQuotedParserStringOrThrow('space', (token) => new Error(`unknown:${token}`)),
        /unknown:space/
    );

    const span = spanFromTokenMeta(
        [
            { line: 1, column: 2, token: 'go' },
            { line: 1, column: 5, token: '10' },
        ],
        0,
        2
    );
    assert.deepEqual(span, {
        start: { line: 1, column: 2, token: 'go' },
        end: { line: 1, column: 7, token: '10' },
    });

    const error = new Error('boom');
    error.name = 'RavlykError';
    attachParserErrorLocation(error, 1, [
        { line: 3, column: 1, token: 'a' },
        { line: 3, column: 4, token: 'b' },
    ]);
    assert.equal(error.line, 3);
    assert.equal(error.column, 4);
    assert.equal(error.token, 'b');
});

runTest('parser statement dispatcher routes assignment and unknown paren errors', () => {
    const assignment = parseNextStatementToAst({
        tokens: ['score', '=', '10'],
        tokenMeta: null,
        index: 0,
        token: 'score',
        tokenLower: 'score',
        isValidIdentifier: (identifier) => /^[a-z]+$/i.test(identifier),
        parseCreateStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parseGameStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parseMoveStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parseTurnStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parseColorStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parsePenStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parseClearStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parseGotoStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parseRepeatStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parseIfStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        parseAssignmentStatementToAst: () => ({ stmt: { type: 'AssignmentStmt' }, nextIndex: 3 }),
        parseFunctionCallStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
        createUnknownCommandError: (tokenValue) => new Error(`unknown:${tokenValue}`),
        keywordCreate: 'створити',
        keywordGame: 'грати',
        keywordBackward: 'назад',
        keywordLeft: 'ліворуч',
        keywordPenUp: 'підняти',
        keywordIf: 'якщо',
    });
    assert.equal(assignment.stmt.type, 'AssignmentStmt');
    assert.equal(assignment.nextIndex, 3);

    assert.throws(() => {
        parseNextStatementToAst({
            tokens: ['('],
            tokenMeta: null,
            index: 0,
            token: '(',
            tokenLower: '(',
            isValidIdentifier: () => false,
            parseCreateStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseGameStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseMoveStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseTurnStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseColorStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parsePenStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseClearStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseGotoStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseRepeatStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseIfStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseAssignmentStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            parseFunctionCallStatementToAst: () => ({ stmt: null, nextIndex: 0 }),
            createUnknownCommandError: (tokenValue) => new Error(`unknown:${tokenValue}`),
            keywordCreate: 'створити',
            keywordGame: 'грати',
            keywordBackward: 'назад',
            keywordLeft: 'ліворуч',
            keywordPenUp: 'підняти',
            keywordIf: 'якщо',
        });
    }, /unknown:\( \(неочікувана дужка\)/);
});

runTest('parser statement context builds dispatcher around parser callbacks', () => {
    const context = createParserStatementContext({
        parser: {
            spanFromMeta: () => null,
            parseAstExpressionOrThrow: () => ({ expr: { type: 'NumberLiteral', value: 1 }, nextIndex: 2 }),
            parseAstBlockOrThrow: () => ({ body: [], nextIndex: 3 }),
            parseAstConditionOrThrow: () => ({ condition: { type: 'EdgeCondition' }, nextIndex: 1 }),
            normalizeIdentifier: (identifier) => String(identifier).toLowerCase(),
            isValidIdentifier: (identifier) => /^[a-z]+$/i.test(identifier),
        },
        RavlykErrorCtor: class FakeError extends Error {
            constructor(code, ...params) {
                super(`${code}:${params.join(',')}`);
                this.messageKey = code;
            }
        },
        keywords: {
            create: 'створити',
            ifKeyword: 'якщо',
            elseKeyword: 'інакше',
            game: 'грати',
            backward: 'назад',
            left: 'ліворуч',
            penUp: 'підняти',
            gotoPreposition: 'в',
        },
    });

    const parsed = context.parseNextStatementToAst(['score', '=', '1'], null, 0);
    assert.equal(parsed.stmt.type, 'AssignmentStmt');
    assert.equal(parsed.nextIndex, 2);
});

runTest('parser statement handlers build parser-bound helper set', () => {
    const handlers = createParserStatementHandlers({
        parser: {
            spanFromMeta: () => null,
            parseAstExpressionOrThrow: (_tokens, _meta, startIndex) => ({
                expr: { type: 'NumberLiteral', value: 5 },
                nextIndex: startIndex + 1,
            }),
            parseAstBlockOrThrow: () => ({ body: [], nextIndex: 4 }),
            parseAstConditionOrThrow: () => ({ condition: { type: 'EdgeCondition' }, nextIndex: 2 }),
            normalizeIdentifier: (identifier) => String(identifier).toLowerCase(),
            isValidIdentifier: (identifier) => /^[a-z]+$/i.test(identifier),
        },
        keywords: {
            backward: 'backward',
            left: 'left',
            penUp: 'penup',
            gotoPreposition: 'to',
            elseKeyword: 'else',
        },
        createError: (code, token) => new Error(`${code}:${token || ''}`),
    });

    assert.equal(handlers.isValidIdentifier('score'), true);
    const move = handlers.parseMoveStatementToAst(['forward', '5'], null, 0, 'forward');
    assert.equal(move.stmt.type, 'MoveStmt');
    const assign = handlers.parseAssignmentStatementToAst(['score', '=', '5'], null, 0);
    assert.equal(assign.stmt.type, 'AssignmentStmt');
});

console.log('Parser helper tests completed.');
