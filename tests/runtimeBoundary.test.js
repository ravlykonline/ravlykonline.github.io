import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RavlykInterpreter } from '../js/modules/ravlykInterpreter.js';
import { RavlykParser } from '../js/modules/ravlykParser.js';
import { executeCommandsRuntime } from '../js/modules/ravlykInterpreterRuntime.js';
import { runTest, runAsyncTest } from './testUtils.js';

runTest('runtime boundary: legacy flat-queue modules stay removed', () => {
    assert.equal(fs.existsSync('js/modules/interpreterAstQueueAdapter.js'), false);
    assert.equal(fs.existsSync('js/modules/interpreterQueueRuntime.js'), false);
    assert.equal(fs.existsSync('js/modules/interpreterCommandClone.js'), false);
});

runTest('runtime boundary: legacy compatibility methods stay absent', () => {
    for (const name of ['parseTokens', 'astToLegacyQueue', 'evaluateIfCondition', 'runCommandQueue']) {
        assert.equal(typeof RavlykInterpreter.prototype[name], 'undefined', `${name} must stay removed`);
    }
});

await runAsyncTest('runtime boundary: executeCommands routes normal programs to AST animation', async () => {
    let runAstAnimationCalled = false;
    const runtime = {
        isExecuting: false,
        shouldStop: false,
        isPaused: false,
        boundaryWarningShown: false,
        parser: new RavlykParser(),
        commandIndicatorUpdater() {},
        validateGameProgramContract() {},
        executeGameProgram: async () => {},
        runAstAnimation: async () => { runAstAnimationCalled = true; },
    };

    await executeCommandsRuntime(runtime, 'вперед 100');
    assert.equal(runAstAnimationCalled, true);
});
