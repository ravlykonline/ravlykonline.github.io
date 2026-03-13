import { parseNextStatementToAst as parseNextStatementToAstHelper } from './parserStatementDispatcher.js';
import { createParserStatementHandlers } from './parserStatementHandlers.js';

export function createParserStatementContext({
    parser,
    RavlykErrorCtor,
    keywords,
}) {
    const createError = (messageKey, ...params) => new RavlykErrorCtor(messageKey, ...params);
    const statementHandlers = createParserStatementHandlers({ parser, keywords, createError });

    return {
        parseNextStatementToAst: (tokens, tokenMeta, index) => {
            const token = tokens[index];
            const tokenLower = token.toLowerCase();
            return parseNextStatementToAstHelper({
                tokens,
                tokenMeta,
                index,
                token,
                tokenLower,
                ...statementHandlers,
                createUnknownCommandError: (rawToken) => createError('UNKNOWN_COMMAND', rawToken),
                keywordCreate: keywords.create,
                keywordGame: keywords.game,
                keywordBackward: keywords.backward,
                keywordLeft: keywords.left,
                keywordPenUp: keywords.penUp,
                keywordIf: keywords.ifKeyword,
            });
        },
    };
}
