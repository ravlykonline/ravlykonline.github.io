# Accessibility Checklist

Use this checklist after accessibility-related changes and before release.

## Priority

### P1

- Verify the accessibility settings panel exists and works on every public page:
  - `index.html`
  - `lessons.html`
  - `manual.html`
  - `quiz.html`
  - `resources.html`
  - `advice_for_parents.html`
  - `teacher_guidelines.html`
  - `zen.html`
  - `about.html`
- Verify `skip-link` is the first keyboard stop on page load.
- Verify `skip-link` moves focus to `#main-content`.
- Verify the accessibility panel opens, traps focus, closes on `Escape`, and returns focus to the toggle.
- Verify settings persist after reload:
  - high contrast
  - larger text
  - reduced motion
  - dyslexia-friendly font
- Verify high contrast on all public pages keeps:
  - readable foreground/background contrast
  - visible focus rings
  - distinct action states for cards, buttons, tables, and notices
- Run keyboard smoke on desktop and mobile/tablet viewports.
- Run a short screen reader smoke on core pages:
  - `index.html`
  - `manual.html`
  - `lessons.html`

### P2

- Check heading hierarchy on public pages.
- Check that every page has one `main` landmark.
- Check accessible names for icon-only buttons, dialogs, and close controls.
- Check `target="_blank"` links keep `rel="noopener noreferrer"`.
- Check larger text mode does not cause clipped buttons, hidden labels, or modal overflow.
- Check reduced motion mode removes non-essential motion and smooth scrolling where needed.

## Automated Checks

Run after each code change:

```powershell
npm run test:unit
npm run test:e2e
```

Focus on these suites when accessibility code is touched:

- `tests/accessibility.test.js`
- `tests/e2e/accessibility.pages.spec.js`
- `tests/e2e/accessibility.checklist.spec.js`
- `tests/e2e/accessibility.persistence.spec.js`
- `tests/e2e/accessibility.high-contrast.spec.js`
- `tests/e2e/index.smoke.spec.js`
- `tests/encoding.test.js`

## Manual Keyboard Smoke

For each public page:

1. Load the page from a fresh tab.
2. Press `Tab` once and confirm focus lands on the skip-link.
3. Activate the skip-link and confirm focus moves into `main`.
4. Tab to the accessibility toggle and open the panel.
5. Confirm focus moves inside the panel.
6. Press `Tab` through the panel and confirm focus stays trapped.
7. Press `Escape` and confirm the panel closes and focus returns to the toggle.

## Screen Reader Smoke

Check with a screen reader on at least `index.html`, `manual.html`, and `lessons.html`.

- Confirm the page language is announced as Ukrainian.
- Confirm the skip-link is announced clearly.
- Confirm the `main` landmark is present.
- Confirm the accessibility toggle has a clear name and expanded/collapsed state.
- Confirm each setting label is announced once and matches the visible label.
- Confirm opening and closing the panel is understandable in context.

## Visual Settings Review

Check each setting on desktop and mobile widths.

- High contrast:
  - text stays readable
  - focus rings remain visible
  - action buttons remain distinguishable
  - cards, notices, and table cells do not fall back to light backgrounds with light text
- Larger text:
  - no clipped text
  - no overlapping controls
  - dialogs remain scrollable and readable
- Reduced motion:
  - no distracting smooth scroll or animated transitions remain
- Dyslexia-friendly font:
  - text remains readable
  - line breaks and button sizing still look correct

## Release Gate

Accessibility changes are ready to ship when:

- `npm run test:unit` passes
- `npm run test:e2e` passes
- P1 manual checks are complete
- no public page is missing the shared accessibility shell
- no keyboard regression is found in `skip-link`, `main`, or panel focus flow
- no high-contrast regression is found on quiz, lessons, zen, resources, teacher, or parent pages
