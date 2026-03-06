import assert from 'node:assert/strict';
import {
    findClosingParenIndex,
    parseAstBlockOrThrow,
    parseAstConditionOrThrow,
} from '../js/modules/parserBlocksConditions.js';
import { parseCreateStatementToAst } from '../js/modules/parserCreateStatement.js';
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

console.log('Parser helper tests completed.');
