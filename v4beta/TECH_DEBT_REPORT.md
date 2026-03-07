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
- some duplicated or lower-value legacy fragments were flattened,
- example/result/challenge/error follow-up duplication was reduced in a small verified cleanup pass,
- remaining low-level manual content literals were further normalized into shared manual tokens.

Current status:
- significantly safer to maintain than at the start of the cleanup,
- still has smaller follow-up clusters, mostly in lower-level content/a11y noise and broader selector organization.

### `manual.html`

Progress made:
- large sections were split into meaningful subsections,
- repeated content containers received clearer semantic boundaries,
- message/error-heavy areas became less flat,
- repeated subsection wrappers now use more consistent structural classes for errors, challenges, and callout-heavy groups,
- intro/basic/repetition/next-step content blocks were also aligned to the same subsection-wrapper pattern instead of mixing direct article children with wrapped groups,
- the `errors` article now has an explicit overview subsection instead of a flat intro block ahead of the message groups,
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

## Latest incremental progress

### `lessons.html`

Progress made:
- repeated support blocks (`why-important`, `task`, `tip`) now share consistent structural lesson-specific classes,
- lessons 1-9 now also use explicit subsection wrappers for intro/example clusters instead of relying only on a flat stream of headings and blocks,
- the file is still large, but repeated lesson patterns are becoming easier to target without one-off selectors or manual scanning.

Current status:
- still a large static file,
- no longer the next urgent structural target after the subsection-wrapper cleanup completed across lessons 1-9.

### test stability

Progress made:
- the timing-sensitive `game loop keeps environment state between ticks` test in `tests/parser.ast-runtime.test.js` no longer depends on a narrow fixed sleep window,
- repeated local reruns and a full `npm test` pass completed successfully after that change.

Current status:
- test stability should still be watched over time,
- but this is no longer the first follow-up priority.

## Current priority order

1. Finish the remaining high-signal cleanup in `css/manual.css`.
2. Treat `css/main-editor.css` as near-complete and revisit only for narrow cosmetic follow-up.
3. Keep `lessons.html` in watch-mode instead of active refactor mode unless new content changes justify another pass.
4. Revisit `manual.html` only if there is a clear payoff from deeper content-structure refactoring.
5. Keep broader JS hygiene and test-suite observation as lower-priority maintenance work.

## Practical conclusion

The cleanup work is paying off.
The repository is now in a better state not because debt disappeared, but because:
- the biggest debt areas are clearer,
- the riskiest CSS files are less chaotic,
- the main HTML hotspots are more structured and less expensive to modify safely,
- the remaining near-term risk is now more about CSS residue and test-suite reliability than about gross HTML monoliths.
- the manual page is less structurally monolithic,
- refactoring can continue in smaller, verified steps.

The project should keep prioritizing static-layer maintainability until the remaining large HTML/CSS hotspots are brought under the same level of control.
