# Release Checklist

## Before Deploy

1. Confirm the working tree is clean with `git status --short`.
2. If public assets changed, sync the release version with `npm run release:sync-version -- YYYY-MM-DD-N`.
3. Run `npm run test:unit`.
4. Run `npm run test:e2e -- --reporter=dot`.
5. If browser/platform-sensitive UI changed, confirm `firefox-smoke` and `webkit-smoke` pass in Playwright output.
6. Check that `robots.txt` still points to the production sitemap and that `sitemap.xml` includes all public pages.
7. Verify `sw.js` and public HTML files share the same release token and versioned asset URLs.
8. Smoke-check `index.html`, `manual.html`, `lessons.html`, `quiz.html`, and `about.html` on the production domain.

## After Deploy

1. Open `https://ravlyk.org/` in a fresh private window.
2. Confirm service worker registration succeeds and offline reload works after one warm load.
3. Confirm Google Analytics initializes only on `ravlyk.org` or `www.ravlyk.org`.
4. Verify download, share, and accessibility controls still work on desktop and one mobile device.
