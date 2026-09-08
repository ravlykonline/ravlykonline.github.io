import { ERROR_MESSAGES, MAX_AST_NODES } from './constants.js';

// All built-in command keywords (Ukrainian + English aliases).
export const RESERVED_NAMES = new Set([
    'вперед', 'forward',
    'назад', 'backward',
    'праворуч', 'right',
    'ліворуч', 'left',
    'колір', 'color',
    'фон', 'background',
    'підняти', 'penup',
    'опустити', 'pendown',
    'очистити', 'clear',
    'товщина', 'thickness',
    'перейти', 'goto',
    'повторити', 'повтори', 'repeat',
    'поки', 'while',
    'стоп', 'break',
    'якщо', 'if',
    'інакше', 'else',
    'не',
    'створити', 'create',
    'грати', 'game',
    'клавіша', 'key',
    'край', 'edge',
    'в', 'to',
    'випадково', 'random',
    'вишиванка', 'vyshyvanka',
    'звичайний', 'zvychainyi',
    'чекати', 'пауза', 'wait',
    'сховати', 'hide',
    'показати', 'show',
    'додому', 'home',
    'модуль', 'abs',
    'корінь', 'sqrt',
    'кут',
]);

class SemanticError extends Error {
    constructor(message, messageKey, node = null) {
        super(message);
        this.name = 'RavlykError';
        this.messageKey = messageKey;

        const start = node?.span?.start;
        if (typeof start?.line === 'number' && start.line > 0) {
            this.line = start.line;
            this.column = start.column;
            this.token = start.token;
        }
    }
}

function makeErrorAt(node, key, ...args) {
    const template = ERROR_MESSAGES[key];
    const message = typeof template === 'function' ? template(...args) : template;
    return new SemanticError(message, key, node);
}

// Validate all declarations (variables and functions) in a list of statements.
// `symbolTable` tracks the current scope; `parentVars` is the parent scope's
// variable set (only passed when entering a function body so inner `створити`
// can shadow outer names without being flagged as duplicates).
//
// Scope rules that mirror the runtime:
//   - повторити / якщо / грати share the parent scope (same env in runtime).
//   - FunctionDefStmt opens a new child scope (runtime creates new EnvironmentCtor).
//   - Within the same scope a variable name may only be declared once with `створити`.
function validateDeclarations(stmts, symbolTable) {
    for (const node of stmts) {
        if (!node || typeof node !== 'object') continue;

        if (node.type === 'FunctionDefStmt') {
            const { name, params, body } = node;

            if (RESERVED_NAMES.has(name)) {
                throw makeErrorAt(node, 'FUNCTION_NAME_RESERVED', name);
            }
            if (symbolTable.vars.has(name)) {
                throw makeErrorAt(node, 'FUNCTION_NAME_CONFLICT_VARIABLE', name);
            }
            if (symbolTable.funcs.has(name)) {
                throw makeErrorAt(node, 'FUNCTION_ALREADY_EXISTS', name);
            }

            const seenParams = new Set();
            for (const param of params) {
                if (RESERVED_NAMES.has(param)) {
                    throw makeErrorAt(node, 'FUNCTION_PARAM_RESERVED', param);
                }
                if (seenParams.has(param)) {
                    throw makeErrorAt(node, 'FUNCTION_PARAM_DUPLICATE', param);
                }
                seenParams.add(param);
            }

            if (!body || body.length === 0) {
                throw makeErrorAt(node, 'FUNCTION_BODY_EMPTY', name);
            }

            symbolTable.funcs.add(name);
            symbolTable.functionDefs.set(name, node);

            // Function body gets its own scope. Pre-populate vars with the
            // function's parameters so `створити x` inside the body is rejected
            // when `x` is already a parameter name.
            const functionScope = {
                vars: new Set(params),
                funcs: symbolTable.funcs,
                functionDefs: symbolTable.functionDefs,
            };
            validateDeclarations(body, functionScope);
            continue;
        }

        if (node.type === 'AssignmentStmt' && node.declaredWithCreate) {
            const { name } = node;

            if (RESERVED_NAMES.has(name)) {
                throw makeErrorAt(node, 'VARIABLE_NAME_RESERVED', name);
            }
            if (symbolTable.funcs.has(name)) {
                throw makeErrorAt(node, 'VARIABLE_NAME_CONFLICT_FUNCTION', name);
            }
            if (symbolTable.vars.has(name)) {
                throw makeErrorAt(node, 'VARIABLE_ALREADY_DECLARED', name);
            }

            symbolTable.vars.add(name);
            continue;
        }

        // повторити / якщо / грати — recurse into nested bodies using the SAME scope.
        const nested = getNestedStatements(node);
        if (nested.length > 0) {
            validateDeclarations(nested, symbolTable);
        }
    }
}

function validateFunctionCall(node, symbolTable) {
    const def = symbolTable.functionDefs.get(node.name);
    if (!def) {
        throw makeErrorAt(node, 'UNKNOWN_COMMAND', node.name);
    }

    const expected = def.params?.length || 0;
    const actual = node.args?.length || 0;
    if (expected !== actual) {
        throw makeErrorAt(node, 'FUNCTION_ARGUMENT_COUNT', node.name, expected, actual);
    }
}

function findNestedGameStatement(body) {
    for (const node of body || []) {
        if (!node || typeof node !== 'object') continue;
        for (const nested of getNestedStatements(node)) {
            if (nested?.type === 'GameStmt') return nested;
            const found = findNestedGameStatement([nested]);
            if (found) return found;
        }
    }
    return null;
}

function getNestedStatements(node) {
    if (!node || typeof node !== 'object') return [];
    const nested = [];
    if (Array.isArray(node.body)) nested.push(...node.body);
    if (Array.isArray(node.thenBody)) nested.push(...node.thenBody);
    if (Array.isArray(node.elseBody)) nested.push(...node.elseBody);
    return nested;
}

function getChildNodes(node) {
    if (!node || typeof node !== 'object') return [];
    const children = [];
    for (const value of Object.values(node)) {
        if (Array.isArray(value)) {
            for (const item of value) {
                if (item?.type) children.push(item);
            }
        } else if (value?.type) {
            children.push(value);
        }
    }
    return children;
}

function countAstNodes(node, limit) {
    if (!node || typeof node !== 'object') return 0;

    let count = 1;
    if (count > limit) {
        throw makeErrorAt(null, 'AST_TOO_LARGE');
    }

    for (const child of getChildNodes(node)) {
        count += countAstNodes(child, limit - count);
        if (count > limit) {
            throw makeErrorAt(null, 'AST_TOO_LARGE');
        }
    }

    return count;
}

function validateGameContract(ast, functionDefs) {
    const topLevelStatements = ast.body || [];
    const topLevelGameBlocks = topLevelStatements.filter((stmt) => stmt?.type === 'GameStmt');

    if (topLevelGameBlocks.length > 1) {
        throw makeErrorAt(topLevelGameBlocks[1], 'GAME_MODE_SINGLE_BLOCK');
    }

    const nestedGame = findNestedGameStatement(topLevelStatements);
    if (nestedGame) {
        throw makeErrorAt(nestedGame, 'GAME_MODE_NESTED_BLOCK');
    }

    if (topLevelGameBlocks.length === 0) return;

    for (const gameStmt of topLevelGameBlocks) {
        const waitStmt = findReachableWaitStatement(gameStmt.body || [], functionDefs);
        if (waitStmt) {
            throw makeErrorAt(waitStmt, 'WAIT_IN_GAME_MODE');
        }
    }

    for (const stmt of topLevelStatements) {
        if (!stmt || !stmt.type) continue;
        if (stmt.type === 'GameStmt') continue;
        if (stmt.type === 'FunctionDefStmt') continue;
        if (stmt.type === 'AssignmentStmt' && stmt.declaredWithCreate) continue;
        throw makeErrorAt(stmt, 'GAME_MODE_TOP_LEVEL_ONLY');
    }
}

function findReachableWaitStatement(stmts, functionDefs, visitedFunctions = new Set()) {
    for (const node of stmts || []) {
        if (!node || typeof node !== 'object') continue;
        if (node.type === 'WaitStmt') return node;
        if (node.type === 'FunctionCallStmt' && !visitedFunctions.has(node.name)) {
            visitedFunctions.add(node.name);
            const functionDef = functionDefs.get(node.name);
            const functionWait = findReachableWaitStatement(
                functionDef?.body || [],
                functionDefs,
                visitedFunctions
            );
            if (functionWait) return functionWait;
        }
        const found = findReachableWaitStatement(
            getNestedStatements(node),
            functionDefs,
            visitedFunctions
        );
        if (found) return found;
    }
    return null;
}

function validateBreakUsage(stmts, loopDepth = 0) {
    for (const node of stmts || []) {
        if (!node || typeof node !== 'object') continue;

        if (node.type === 'BreakStmt') {
            if (loopDepth <= 0) {
                throw makeErrorAt(node, 'BREAK_OUTSIDE_LOOP');
            }
            continue;
        }

        if (node.type === 'RepeatStmt' || node.type === 'WhileStmt') {
            validateBreakUsage(node.body || [], loopDepth + 1);
            continue;
        }

        if (node.type === 'IfStmt') {
            validateBreakUsage(node.thenBody || [], loopDepth);
            validateBreakUsage(node.elseBody || [], loopDepth);
            continue;
        }

        if (node.type === 'FunctionDefStmt') {
            validateBreakUsage(node.body || [], 0);
            continue;
        }

        validateBreakUsage(getNestedStatements(node), loopDepth);
    }
}

function validateStatement(node, symbolTable) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionCallStmt') {
        validateFunctionCall(node, symbolTable);
    }

    for (const nested of getNestedStatements(node)) {
        validateStatement(nested, symbolTable);
    }
}

export function validateProgramAst(ast, options = {}) {
    if (!ast || !ast.body) return ast;

    countAstNodes(ast, options.maxAstNodes ?? MAX_AST_NODES);

    const symbolTable = {
        vars: new Set(),
        funcs: new Set(),
        functionDefs: new Map(),
    };

    validateDeclarations(ast.body, symbolTable);

    validateGameContract(ast, symbolTable.functionDefs);

    validateBreakUsage(ast.body);

    for (const node of ast.body) {
        validateStatement(node, symbolTable);
    }

    return ast;
}
