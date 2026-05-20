import { ERROR_MESSAGES, MAX_AST_NODES } from './constants.js';

// All built-in command keywords (Ukrainian + English aliases).
const RESERVED_NAMES = new Set([
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
    'якщо', 'if',
    'інакше', 'else',
    'створити', 'create',
    'грати', 'game',
    'клавіша', 'key',
    'край', 'edge',
    'в', 'to',
    'випадково', 'random',
]);

class SemanticError extends Error {
    constructor(message) {
        super(message);
        this.name = 'RavlykError';
    }
}

function makeError(key, ...args) {
    const template = ERROR_MESSAGES[key];
    const message = typeof template === 'function' ? template(...args) : template;
    return new SemanticError(message);
}

function validateDeclaration(node, symbolTable) {
    if (!node || typeof node !== 'object') return;

    if (node.type === 'FunctionDefStmt') {
        const { name, params, body } = node;

        if (RESERVED_NAMES.has(name)) {
            throw makeError('FUNCTION_NAME_RESERVED', name);
        }
        if (symbolTable.vars.has(name)) {
            throw makeError('FUNCTION_NAME_CONFLICT_VARIABLE', name);
        }
        if (symbolTable.funcs.has(name)) {
            throw makeError('FUNCTION_ALREADY_EXISTS', name);
        }

        const seenParams = new Set();
        for (const param of params) {
            if (RESERVED_NAMES.has(param)) {
                throw makeError('FUNCTION_PARAM_RESERVED', param);
            }
            if (seenParams.has(param)) {
                throw makeError('FUNCTION_PARAM_DUPLICATE', param);
            }
            seenParams.add(param);
        }

        if (!body || body.length === 0) {
            throw makeError('FUNCTION_BODY_EMPTY', name);
        }

        symbolTable.funcs.add(name);
        symbolTable.functionDefs.set(name, node);
        return;
    }

    if (node.type === 'AssignmentStmt' && node.declaredWithCreate) {
        const { name } = node;

        if (RESERVED_NAMES.has(name)) {
            throw makeError('VARIABLE_NAME_RESERVED', name);
        }
        if (symbolTable.funcs.has(name)) {
            throw makeError('VARIABLE_NAME_CONFLICT_FUNCTION', name);
        }
        if (symbolTable.vars.has(name)) {
            throw makeError('VARIABLE_ALREADY_DECLARED', name);
        }

        symbolTable.vars.add(name);
    }
}

function validateFunctionCall(node, symbolTable) {
    const def = symbolTable.functionDefs.get(node.name);
    if (!def) {
        throw makeError('UNKNOWN_COMMAND', node.name);
    }

    const expected = def.params?.length || 0;
    const actual = node.args?.length || 0;
    if (expected !== actual) {
        throw makeError('FUNCTION_ARGUMENT_COUNT', node.name, expected, actual);
    }
}

function countGameStatementsInBody(body) {
    let count = 0;
    for (const node of body || []) {
        if (!node || typeof node !== 'object') continue;
        if (node.type === 'GameStmt') count++;
        count += countGameStatementsInBody(getNestedStatements(node));
    }
    return count;
}

function hasNestedGameStatement(body) {
    for (const node of body || []) {
        if (!node || typeof node !== 'object') continue;
        if (countGameStatementsInBody(getNestedStatements(node)) > 0) {
            return true;
        }
    }
    return false;
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
        throw makeError('AST_TOO_LARGE');
    }

    for (const child of getChildNodes(node)) {
        count += countAstNodes(child, limit - count);
        if (count > limit) {
            throw makeError('AST_TOO_LARGE');
        }
    }

    return count;
}

function validateGameContract(ast) {
    const topLevelStatements = ast.body || [];
    const topLevelGameBlocks = topLevelStatements.filter((stmt) => stmt?.type === 'GameStmt');

    if (topLevelGameBlocks.length > 1) {
        throw makeError('GAME_MODE_SINGLE_BLOCK');
    }

    if (hasNestedGameStatement(topLevelStatements)) {
        throw makeError('GAME_MODE_NESTED_BLOCK');
    }

    if (topLevelGameBlocks.length === 0) return;

    for (const stmt of topLevelStatements) {
        if (!stmt || !stmt.type) continue;
        if (stmt.type === 'GameStmt') continue;
        if (stmt.type === 'FunctionDefStmt') continue;
        if (stmt.type === 'AssignmentStmt' && stmt.declaredWithCreate) continue;
        throw makeError('GAME_MODE_TOP_LEVEL_ONLY');
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

    for (const node of ast.body) {
        validateDeclaration(node, symbolTable);
    }

    validateGameContract(ast);

    for (const node of ast.body) {
        validateStatement(node, symbolTable);
    }

    return ast;
}
