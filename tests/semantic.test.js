import assert from 'node:assert/strict';
import { RavlykParser } from '../js/modules/ravlykParser.js';
import { validateProgramAst } from '../js/modules/semanticValidator.js';
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
