import { ERROR_MESSAGES } from './constants.js';

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
    'в',
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

function validateNode(node, symbolTable) {
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

        symbolTable.vars.add(name);
        return;
    }
}

export function validateProgramAst(ast) {
    if (!ast || !ast.body) return ast;

    const symbolTable = { vars: new Set(), funcs: new Set() };

    for (const node of ast.body) {
        validateNode(node, symbolTable);
    }

    return ast;
}
