export function normalizeConditionKey(rawKey) {
    const value = String(rawKey || '').trim().toLowerCase();
    const aliases = {
        'вгору': 'arrowup',
        'вниз': 'arrowdown',
        'ліво': 'arrowleft',
        'ліворуч': 'arrowleft',
        'право': 'arrowright',
        'праворуч': 'arrowright',
        up: 'arrowup',
        down: 'arrowdown',
        left: 'arrowleft',
        right: 'arrowright',
    };
    return aliases[value] || value;
}
function createConditionValueError(node, fallbackNode) {
    const error = new Error(ERROR_MESSAGES.CONDITION_VALUE_INVALID);
    error.name = 'RavlykError';
    error.messageKey = 'CONDITION_VALUE_INVALID';
    attachAstErrorLocation(error, node);
    attachAstErrorLocation(error, fallbackNode);
    return error;
}

function evaluateCompareOp(left, right, op, condition) {
    if (!Number.isFinite(left)) {
        throw createConditionValueError(condition.left, condition);
    }
    if (!Number.isFinite(right)) {
        throw createConditionValueError(condition.right, condition);
    }
    if (op === '=') return left === right;
    if (op === '!=') return left !== right;
    if (op === '<') return left < right;
    if (op === '>') return left > right;
    if (op === '<=') return left <= right;
    if (op === '>=') return left >= right;
    return false;
}

export function evaluateAstCondition(condition, { evalAstNumberExpression, env, isAtCanvasEdge, pressedKeys }) {
    if (!condition || !condition.type) return false;
    if (condition.type === 'NotCondition') {
        return !evaluateAstCondition(condition.condition, { evalAstNumberExpression, env, isAtCanvasEdge, pressedKeys });
    }
    if (condition.type === 'CompareCondition') {
        const left = evalAstNumberExpression(condition.left, env);
        const right = evalAstNumberExpression(condition.right, env);
        return evaluateCompareOp(left, right, condition.op, condition);
    }
    if (condition.type === 'EdgeCondition') {
        return isAtCanvasEdge();
    }
    if (condition.type === 'KeyCondition') {
        const expected = normalizeConditionKey(condition.key);
        return pressedKeys.has(expected);
    }
    return false;
}
import { ERROR_MESSAGES } from './constants.js';
import { attachAstErrorLocation } from './interpreterAstEval.js';
