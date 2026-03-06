function defaultCreateError(messageKey) {
    const error = new Error(messageKey);
    error.messageKey = messageKey;
    return error;
}

export function hasGameStatement(node) {
    if (!node || typeof node !== 'object') return false;
    if (node.type === 'GameStmt') return true;
    if (Array.isArray(node.body) && node.body.some((item) => hasGameStatement(item))) return true;
    if (Array.isArray(node.thenBody) && node.thenBody.some((item) => hasGameStatement(item))) return true;
    if (Array.isArray(node.elseBody) && node.elseBody.some((item) => hasGameStatement(item))) return true;
    return false;
}

export function validateGameProgramContract(programAst, options = {}) {
    const createError = options.createError || defaultCreateError;
    const hasGameStatementFn = options.hasGameStatementFn || hasGameStatement;

    if (!programAst || !Array.isArray(programAst.body)) return;
    const topLevelStatements = programAst.body;
    const topLevelGameBlocks = topLevelStatements.filter((stmt) => stmt?.type === 'GameStmt');
    if (topLevelGameBlocks.length === 0) return;
    if (topLevelGameBlocks.length > 1) {
        throw createError('GAME_MODE_SINGLE_BLOCK');
    }

    for (const stmt of topLevelStatements) {
        if (!stmt || !stmt.type) continue;
        if (stmt.type === 'GameStmt') {
            if (hasGameStatementFn({ type: 'Program', body: stmt.body || [] })) {
                throw createError('GAME_MODE_NESTED_BLOCK');
            }
            continue;
        }
        if (stmt.type === 'AssignmentStmt') continue;
        if (stmt.type === 'FunctionDefStmt') {
            if (hasGameStatementFn({ type: 'Program', body: stmt.body || [] })) {
                throw createError('GAME_MODE_NESTED_BLOCK');
            }
            continue;
        }
        throw createError('GAME_MODE_TOP_LEVEL_ONLY');
    }
}
