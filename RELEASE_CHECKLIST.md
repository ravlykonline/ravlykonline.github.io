# Release Checklist

## Before Deploy

1. Confirm the working tree is clean with `git status --short`.
2. If public assets changed, sync the release version with `npm run release:sync-version -- YYYY-MM-DD-N`.
3. Run `npm run check`. This includes `npm run precache:check`, root unit tests, the `go` and `artist` suites, shared HTML partial checks, and ESLint.
4. Run `npm run test:e2e -- --reporter=dot`; confirm the four `game` browser harness suites pass in the desktop Chromium project.
5. If browser/platform-sensitive UI changed, confirm `firefox-smoke` and `webkit-smoke` pass in Playwright output.
6. Run `npm run pages:build` and confirm the allowlist artifact excludes tests, logs, backups, and unfinished projects.
7. Check that `robots.txt` still points to the production sitemap and that `sitemap.xml` includes all public pages.
8. Verify `sw.js` and public HTML files share the same release token and versioned asset URLs.
9. Smoke-check `index.html`, `manual.html`, `lessons.html`, `quiz.html`, `about.html`, and `privacy.html` on the production domain.

## After Deploy

1. Open `https://ravlyk.org/` in a fresh private window.
2. Confirm service worker registration succeeds and offline reload works after one warm load.
3. Confirm public pages include the Cloudflare Web Analytics beacon and do not include Google Analytics scripts.
4. Verify download, share, and accessibility controls still work on desktop and one mobile device.
5. Confirm intended public projects (`old`, `artist`, `game`, `go`) return `200`, while tests, logs, backups, and `maisternia` remain unavailable.
