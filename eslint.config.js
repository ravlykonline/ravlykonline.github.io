// Minimal ESLint config — security and bug-catching rules only.
// No formatting rules (no Prettier), no style enforcement.
// Goal: catch eval/innerHTML misuse and common logic bugs before they ship.

export default [
    {
        // Lint production JS only. Tests use assert/process which trigger some rules.
        files: ['js/**/*.js', 'sw.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Browser globals used in sw.js and modules
                self: 'readonly',
                caches: 'readonly',
                fetch: 'readonly',
                Response: 'readonly',
                navigator: 'readonly',
                window: 'readonly',
                document: 'readonly',
                location: 'readonly',
                console: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                performance: 'readonly',
                Promise: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                Blob: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                btoa: 'readonly',
                atob: 'readonly',
                localStorage: 'readonly',
                getComputedStyle: 'readonly',
                ResizeObserver: 'readonly',
                Event: 'readonly',
                KeyboardEvent: 'readonly',
                MouseEvent: 'readonly',
                HTMLElement: 'readonly',
                HTMLCanvasElement: 'readonly',
                Image: 'readonly',
                Map: 'readonly',
                Set: 'readonly',
                WeakMap: 'readonly',
            },
        },
        rules: {
            // ── Security ──────────────────────────────────────────────────────
            // Block dynamic code execution entirely.
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-new-func': 'error',

            'no-restricted-syntax': [
                'error',
                // Forbid document.write / document.writeln
                {
                    selector: "CallExpression[callee.object.name='document'][callee.property.name=/^write(ln)?$/]",
                    message: 'document.write() and document.writeln() are forbidden.',
                },
                // Forbid innerHTML assignments with non-literal values.
                // Constant string literals (icon markup, static templates) are allowed.
                // Any assignment of a variable/expression to innerHTML is flagged.
                {
                    selector: "AssignmentExpression[left.property.name='innerHTML'][right.type!='Literal'][right.type!='TemplateLiteral']",
                    message: 'Do not assign non-literal values to innerHTML. Use textContent or createElement instead.',
                },
                {
                    selector: "AssignmentExpression[left.property.name='innerHTML'][right.type='TemplateLiteral'][right.expressions.length>0]",
                    message: 'Do not use template literals with expressions in innerHTML assignments. Use textContent or createElement instead.',
                },
            ],

            // ── Bugs ──────────────────────────────────────────────────────────
            'no-unused-vars': ['error', {
                vars: 'all',
                args: 'none',                       // allow unused function params (common in callbacks)
                ignoreRestSiblings: true,
                varsIgnorePattern: '^_',             // allow _unused convention for variables
                caughtErrors: 'all',
                caughtErrorsIgnorePattern: '^_',     // allow catch (_) or catch (_err) convention
            }],
            'no-undef': 'error',
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
            'no-constant-condition': 'error',
            'no-duplicate-case': 'error',
            'no-unreachable': 'error',
            'use-isnan': 'error',
        },
    },
];
