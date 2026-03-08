# Release Preparation Plan

Snapshot date: 2026-03-08

## Current status

- Unit tests pass.
- Playwright smoke tests pass on desktop, mobile, and tablet profiles.
- The repository is close to release-ready from a functional standpoint.
- The main remaining work is release hardening, documentation accuracy, and static-layer maintenance.

## Critical issues plan

These items should be treated as pre-publication blockers or near-blockers:

1. Documentation truthfulness
- Keep `README.md`, `TECHNICAL_GUIDE.md`, and release notes aligned with the real test/runtime model.
- Prevent stale claims about tools, archived pages, or rollback artifacts.

2. Manual/editor regression watch
- Re-run `npm run test:unit` and `npm run test:e2e` before every release candidate.
- Prioritize any regression in `manual.html`, `index.html`, modal flows, accessibility settings, file export, and game mode.

3. Static content verification
- Do a final visual pass over `index.html`, `manual.html`, `lessons.html`, `resources.html`, `teacher_guidelines.html`, and `advice_for_parents.html`.
- Check Ukrainian copy, broken anchors, layout overflow, and mobile readability.

4. Release metadata hygiene
- Recheck `robots.txt`, `sitemap.xml`, `site.webmanifest`, icons, and public links before deploy.
- Confirm that all `target="_blank"` links keep `rel="noopener noreferrer"`.

## Active tech debt priorities

1. `css/manual.css`
- Highest-value remaining cleanup area.
- Focus on selector flattening, repeated literals/tokens, and lower-level a11y noise.

2. `manual.html`
- Keep as watch-mode unless there is a clear structural payoff.
- Prefer small semantic cleanups over another large rewrite.

3. `css/main-editor.css`
- Near-complete.
- Only take small cosmetic or consistency passes that are easy to verify.

4. JS hygiene
- Lower priority than static-layer cleanup.
- Limit work to targeted readability improvements or bug-preventive extraction when touching related code.

## Changes completed in this update

- Removed `lessons_old.html` from the release branch.
- Removed archive-only selectors from `css/lessons.css`.
- Added regression coverage so the archive rollback page and archive-only lesson selectors do not return silently.
- Fixed documentation drift about the test setup.

## Recommended next batch

1. Do a focused cleanup pass in `css/manual.css`.
2. Run a manual page-by-page visual QA pass in responsive layouts.
3. Prepare a concise release checklist for deployment day.
