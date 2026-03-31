# Tests

- `core.test.js`: levels, syntax, board structure, solvability.
- `progress.test.js`: session storage and level progress behavior.
- `engine.test.js`: engine regressions such as turn-hint behavior.
- `ui-structure.test.js`: HTML/CSS/UI smoke checks and safe-delete wiring.
- `encoding.test.js`: UTF-8 and anti-mojibake checks.
- `source-smoke.test.js`: source-level symbol and style smoke checks.
- `testHelpers.cjs`: shared helpers for VM bootstrapping and fixtures.

When adding a new test, prefer the smallest domain file that already matches the behavior under test. If no file fits cleanly, create a new domain-focused file instead of growing a catch-all suite.
