import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:4173';
const WINDOWS_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const configuredBrowser = process.env.RAVLYK_BROWSER_PATH;
const executablePath = configuredBrowser || (fs.existsSync(WINDOWS_CHROME) ? WINDOWS_CHROME : undefined);
let serverProcess = null;

async function isServerReady() {
    try {
        const response = await fetch(`${BASE_URL}/index.html`);
        return response.ok;
    } catch {
        return false;
    }
}

async function ensureServer() {
    if (await isServerReady()) return;
    serverProcess = spawn(process.execPath, ['tests/e2e/server.js'], {
        cwd: path.resolve('.'),
        stdio: 'ignore',
        windowsHide: true,
    });
    for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (await isServerReady()) return;
    }
    throw new Error('Performance server did not become ready.');
}

function summarize(samples) {
    const sorted = [...samples].sort((a, b) => a - b);
    return {
        minMs: Number(sorted[0].toFixed(3)),
        medianMs: Number(sorted[Math.floor(sorted.length / 2)].toFixed(3)),
        maxMs: Number(sorted.at(-1).toFixed(3)),
        over50ms: sorted.filter((value) => value > 50).length,
    };
}

await ensureServer();
const browser = await chromium.launch({ headless: true, executablePath });

try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(async () => {
        const [{ RavlykParser, RavlykError }, { createAstRuntime }, { Environment }, evaluator, conditions, constants] = await Promise.all([
            import('/js/modules/ravlykParser.js'),
            import('/js/modules/interpreterAstRuntime.js'),
            import('/js/modules/environment.js'),
            import('/js/modules/interpreterAstEval.js'),
            import('/js/modules/interpreterConditions.js'),
            import('/js/modules/constants.js'),
        ]);
        const largeExpression = Array.from({ length: 200 }, () => '1').join('+');
        const cases = {
            expressionInLoop: `створити x = 0\nповторити 500 ( x = ${largeExpression} )`,
            emptyNestedLoops: 'повторити 500 ( повторити 500 ( ) )',
        };
        const results = {};
        const evalExpr = (expr, env) => evaluator.evalAstNumberExpression(expr, env, {
            attachAstErrorLocation: evaluator.attachAstErrorLocation,
        });

        for (const [name, code] of Object.entries(cases)) {
            const parseSamples = [];
            const stepSamples = [];
            for (let iteration = 0; iteration < 13; iteration++) {
                const parser = new RavlykParser();
                const parseStart = performance.now();
                const ast = parser.parseCodeToAst(code);
                const parseDuration = performance.now() - parseStart;
                const runtime = createAstRuntime({
                    programAst: ast,
                    EnvironmentCtor: Environment,
                    RavlykErrorCtor: RavlykError,
                    maxRecursionDepth: constants.MAX_RECURSION_DEPTH,
                    maxRepeatsInLoop: constants.MAX_REPEATS_IN_LOOP,
                    maxCommandQueueLength: constants.MAX_COMMAND_QUEUE_LENGTH,
                    maxAstSteps: constants.MAX_COMMAND_QUEUE_LENGTH,
                    maxAstStepsErrorKey: 'COMMAND_QUEUE_OVERFLOW',
                    evalAstNumberExpression: evalExpr,
                    evaluateCondition: (condition, env) => conditions.evaluateAstCondition(condition, {
                        evalAstNumberExpression: evalExpr,
                        env,
                        isAtCanvasEdge: () => false,
                        pressedKeys: new Set(),
                    }),
                    attachAstErrorLocation: evaluator.attachAstErrorLocation,
                });
                const stepStart = performance.now();
                runtime.step();
                const stepDuration = performance.now() - stepStart;
                if (iteration >= 3) {
                    parseSamples.push(parseDuration);
                    stepSamples.push(stepDuration);
                }
            }
            results[name] = { parseSamples, stepSamples };
        }
        return {
            userAgent: navigator.userAgent,
            hardwareConcurrency: navigator.hardwareConcurrency,
            deviceMemoryGiB: navigator.deviceMemory ?? null,
            viewport: `${innerWidth}x${innerHeight}`,
            results,
        };
    });

    const report = {
        measuredAt: new Date().toISOString(),
        browserExecutable: executablePath || 'Playwright bundled Chromium',
        userAgent: result.userAgent,
        hardwareConcurrency: result.hardwareConcurrency,
        deviceMemoryGiB: result.deviceMemoryGiB,
        viewport: result.viewport,
        warmupRuns: 3,
        measuredRuns: 10,
        cases: Object.fromEntries(Object.entries(result.results).map(([name, samples]) => [name, {
            parse: summarize(samples.parseSamples),
            oneRuntimeStep: summarize(samples.stepSamples),
        }])),
    };
    console.log(JSON.stringify(report, null, 2));
} finally {
    await browser.close();
    serverProcess?.kill();
}
