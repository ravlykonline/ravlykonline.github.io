# Release Checklist

## Before Deploy

1. Confirm the working tree is clean with `git status --short`.
2. If public assets changed, set and sync the canonical `release-version.json` value with `npm run release:sync-version -- YYYY-MM-DD-N`. CI enforces this via `npm run release:check-token`: skipping it leaves returning visitors on cached JS/CSS while they receive fresh HTML.
3. Run `npm run check`. This includes precache and documentation contract checks, root unit tests, the `go` and `artist` suites, shared HTML partial checks, and ESLint.
4. Run `npm run test:e2e -- --reporter=dot`; confirm the four `game` browser harness suites pass in the desktop Chromium project.
5. If browser/platform-sensitive UI changed, confirm `firefox-smoke` and `webkit-smoke` pass in Playwright output.
6. Run `npm run pages:build` and confirm Cloudflare Pages will publish the generated `.pages-artifact/`; the allowlist artifact must exclude tests, logs, backups, developer documentation, and unfinished projects.
7. Check that `robots.txt` still points to the production sitemap and that `sitemap.xml` includes all public pages.
8. Verify `sw.js` and public HTML files share the same release token and versioned asset URLs.
9. Smoke-check `index.html`, `manual.html`, `lessons.html`, `quiz.html`, `about.html`, and `privacy.html` on the production domain.
10. Verify the generated critical precache contains the editor, manual, lessons and their JS/CSS dependencies; simulate one critical failure and one optional-media failure.

## After Deploy

1. Open `https://ravlyk.org/` in a fresh private window.
2. Confirm service worker registration succeeds and offline reload works after one warm load.
3. In an already-open tab, perform an upgrade smoke: reload after the new worker activates, verify current HTML/JS/CSS are used, then verify the warm-cache pages offline. `skipWaiting`/`clients.claim` do not by themselves guarantee that every already-open tab avoids mixed versions.
4. Confirm public pages include the Cloudflare Web Analytics beacon and do not include Google Analytics scripts.
5. Verify download, share and accessibility controls, including PNG/TXT/GIF smoke, still work on desktop and one mobile device.
6. Confirm intended public projects (`old`, `artist`, `game`, `go`) return `200`, while tests, logs, backups, and `maisternia` remain unavailable.
