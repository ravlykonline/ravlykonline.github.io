import assert from 'node:assert/strict';
import { RavlykParser } from '../js/modules/ravlykParser.js';
import { validateProgramAst } from '../js/modules/semanticValidator.js';
import { MAX_AST_NODES } from '../js/modules/constants.js';
import { runTest } from './testUtils.js';

function parse(code) {
    const parser = new RavlykParser();
    return parser.parseCodeToAst(code);
}

function validate(code) {
    return validateProgramAst(parse(code));
}

function assertValidationError(code, expectedFragment) {
    try {
        validate(code);
        assert.fail('Expected validation error but none was thrown for: ' + code);
    } catch (e) {
        assert.ok(
            e.message.includes(expectedFragment),
            `Expected error message to include "${expectedFragment}", got: "${e.message}"`
        );
    }
}

// --- Valid programs ---

runTest('semantic: valid empty program passes', () => {
    assert.doesNotThrow(() => validate(''));
});

runTest('semantic: valid movement passes', () => {
    assert.doesNotThrow(() => validate('вперед 100\nправоруч 90'));
});

runTest('semantic: valid variable creation passes', () => {
    assert.doesNotThrow(() => validate('створити x = 10\nвперед x'));
});

runTest('semantic: valid function creation passes', () => {
    assert.doesNotThrow(() => validate('створити квадрат(n) (\n  вперед n\n)\nквадрат(50)'));
});

runTest('semantic: valid nested function call passes', () => {
    assert.doesNotThrow(() => validate(
        'створити лінія(n) ( вперед n )\nстворити дві(n) ( лінія(n) лінія(n) )\nдві(20)'
    ));
});

runTest('semantic: valid function creation no params passes', () => {
    assert.doesNotThrow(() => validate('створити f() (\n  вперед 10\n)'));
});

runTest('semantic: two different functions pass', () => {
    assert.doesNotThrow(() => validate(
        'створити f() ( вперед 10 )\nстворити g() ( вперед 20 )'
    ));
});

// --- Reserved names for functions ---

runTest('semantic: function named вперед is rejected', () => {
    assertValidationError(
        'створити вперед() (\n  назад 10\n)',
        'вперед'
    );
});

runTest('semantic: function named повторити is rejected', () => {
    assertValidationError(
        'створити повторити() (\n  вперед 10\n)',
        'повторити'
    );
});

runTest('semantic: function named якщо is rejected', () => {
    assertValidationError(
        'створити якщо() (\n  вперед 10\n)',
        'якщо'
    );
});

// --- Reserved names for variables ---

runTest('semantic: variable named вперед is rejected', () => {
    assertValidationError('створити вперед = 10', 'вперед');
});

runTest('semantic: variable named колір is rejected', () => {
    assertValidationError('створити колір = 5', 'колір');
});

runTest('semantic: variable named якщо is rejected', () => {
    assertValidationError('створити якщо = 1', 'якщо');
});

// --- Reserved param names ---

runTest('semantic: function param named вперед is rejected', () => {
    assertValidationError(
        'створити f(вперед) (\n  вперед 10\n)',
        'вперед'
    );
});

runTest('semantic: function param named колір is rejected', () => {
    assertValidationError(
        'створити f(колір) (\n  вперед 10\n)',
        'колір'
    );
});

// --- Duplicate function ---

runTest('semantic: duplicate function declaration is rejected', () => {
    assertValidationError(
        'створити f() ( вперед 10 )\nстворити f() ( вперед 20 )',
        'f'
    );
});

// --- Duplicate params ---

runTest('semantic: duplicate parameters are rejected', () => {
    assertValidationError(
        'створити f(а, а) (\n  вперед а\n)',
        'а'
    );
});

// --- Variable/function name conflicts ---

runTest('semantic: variable name conflicts with existing function', () => {
    assertValidationError(
        'створити f() ( вперед 10 )\nстворити f = 5',
        'f'
    );
});

runTest('semantic: function name conflicts with existing variable', () => {
    assertValidationError(
        'створити x = 5\nстворити x() ( вперед 10 )',
        'x'
    );
});

// --- Empty function body ---

runTest('semantic: empty function body is rejected', () => {
    assertValidationError(
        'створити f() ()',
        'f'
    );
});

// --- Function calls ---

runTest('semantic: unknown function call is rejected', () => {
    assertValidationError(
        'невідома(10)',
        'Я не знаю команди'
    );
});

runTest('semantic: function call with missing argument is rejected', () => {
    assertValidationError(
        'створити f(x) ( вперед x )\nf()',
        'очікує 1, а отримала 0'
    );
});

runTest('semantic: function call with extra argument is rejected', () => {
    assertValidationError(
        'створити f(x) ( вперед x )\nf(1, 2)',
        'очікує 1, а отримала 2'
    );
});

runTest('semantic: function call inside function body checks argument count', () => {
    assertValidationError(
        'створити лінія(x) ( вперед x )\nстворити f() ( лінія() )',
        'очікує 1, а отримала 0'
    );
});

// --- Game contract ---

runTest('semantic: game block allows top-level declarations only', () => {
    assert.doesNotThrow(() => validate(
        'створити крок = 5\nстворити рух(n) ( вперед n )\nграти ( рух(крок) )'
    ));
});

runTest('semantic: two game blocks are rejected', () => {
    assertValidationError(
        'грати ( вперед 1 )\nграти ( вперед 2 )',
        'лише один блок'
    );
});

runTest('semantic: nested game block is rejected', () => {
    assertValidationError(
        'повторити 1 ( грати ( вперед 1 ) )',
        'не можна вкладати'
    );
});

runTest('semantic: drawing command next to game block is rejected', () => {
    assertValidationError(
        'вперед 10\nграти ( вперед 1 )',
        'на верхньому рівні дозволені лише'
    );
});

runTest('semantic: assignment without create next to game block is rejected', () => {
    assertValidationError(
        'створити x = 1\nx = 2\nграти ( вперед x )',
        'на верхньому рівні дозволені лише'
    );
});

// --- AST size budget ---

runTest('semantic: AST node budget allows normal small programs', () => {
    const ast = parse('повторити 4 ( вперед 10 праворуч 90 )');
    assert.doesNotThrow(() => validateProgramAst(ast, { maxAstNodes: 10 }));
});

runTest('semantic: AST node budget rejects oversized programs', () => {
    const ast = {
        type: 'Program',
        body: [
            { type: 'MoveStmt', distance: { type: 'NumberLiteral', value: 1 } },
            { type: 'TurnStmt', angle: { type: 'NumberLiteral', value: 90 } },
        ],
    };

    assert.throws(
        () => validateProgramAst(ast, { maxAstNodes: 3 }),
        (error) => error?.name === 'RavlykError' && error.message.includes('забагато частин')
    );
});

runTest('semantic: default AST node budget is exported as a positive limit', () => {
    assert.equal(Number.isInteger(MAX_AST_NODES), true);
    assert.ok(MAX_AST_NODES > 0);
});

// --- Duplicate variable declaration ---
runTest('semantic: duplicate variable declaration with створити is rejected', () => {
    assertValidationError(
        'створити x = 10\nстворити x = 20',
        'x'
    );
});

runTest('semantic: duplicate variable declaration gives friendly redeclaration message', () => {
    try {
        validate('створити рахунок = 0\nстворити рахунок = 1');
        assert.fail('Expected validation error');
    } catch (e) {
        assert.ok(e.name === 'RavlykError', 'error should be RavlykError');
        assert.ok(
            e.message.includes('рахунок') && e.message.includes('вже створена'),
            `Expected friendly message about redeclaration, got: "${e.message}"`
        );
    }
});

runTest('semantic: re-assigning variable without створити is allowed (not a redeclaration)', () => {
    assert.doesNotThrow(() => validate('створити x = 10\nx = 20'));
});
