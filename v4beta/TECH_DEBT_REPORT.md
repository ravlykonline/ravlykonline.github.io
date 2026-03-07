# Technical Debt Report

Snapshot date: 2026-03-07

## Overall assessment

The main technical debt in this repository is still concentrated in the static layer:
- large CSS files,
- large static HTML documents,
- hand-maintained content structures.

This is no longer an undifferentiated "everything is messy" state.
The debt is now better localized and materially reduced in the highest-risk files.

## What improved in this cycle

### `css/manual.css`

Progress made:
- shared panel/content/high-contrast tokens were expanded,
- message/success/info/error clusters were normalized,
- command/example/challenge clusters were partially tokenized,
- repeated spacing/radius/shadow values were reduced,
- some duplicated or lower-value legacy fragments were flattened.

Current status:
- significantly safer to maintain than at the start of the cleanup,
- still has smaller follow-up clusters, mostly in lower-level content/a11y noise.

### `manual.html`

Progress made:
- large sections were split into meaningful subsections,
- repeated content containers received clearer semantic boundaries,
- message/error-heavy areas became less flat,
- the document is more navigable and less monolithic structurally.

Current status:
- much less "frozen" than before,
- still large and hand-maintained,
- no longer the most urgent refactor target unless deeper content restructuring is desired.

### `css/main-editor.css`

Progress made:
- editor/help/commands surfaces were tokenized,
- responsive/editor panel literals were normalized,
- high-contrast editor styles were partially unified around shared tokens,
- duplicate override blocks were reduced,
- remaining scattered color/shadow literals were mostly pulled into tokens.

Current status:
- near done from a debt-reduction perspective,
- remaining work is mostly cosmetic and optional.

## What did not change

### JS core is still not the main problem

The interpreter/runtime area remains comparatively stable:
- large in places,
- but structurally more coherent than the static layer,
- not the main maintainability bottleneck right now.

### Test debt is still secondary

The project still benefits from a stable verification loop:
- unit tests passing,
- Playwright smoke tests passing,
- encoding guards passing.

That means tests currently support refactoring rather than block it.

## Current priority order

1. Finish the remaining high-signal cleanup in `css/manual.css`.
2. Treat `css/main-editor.css` as near-complete and revisit only for narrow cosmetic follow-up.
3. Move to `lessons.html` as the next major static content debt target.
4. Revisit `manual.html` only if there is a clear payoff from deeper content-structure refactoring.
5. Keep JS hygiene and broader test cleanup as lower-priority maintenance work.

## Practical conclusion

The cleanup work is paying off.
The repository is now in a better state not because debt disappeared, but because:
- the biggest debt areas are clearer,
- the riskiest CSS files are less chaotic,
- the manual page is less structurally monolithic,
- refactoring can continue in smaller, verified steps.

The project should keep prioritizing static-layer maintainability until the remaining large HTML/CSS hotspots are brought under the same level of control.
