# RAVLYK v4 Design Executive Summary

Updated: 2026-03-11

## What Is Already Resolved

- `DESIGN_GUIDE.md` is now the primary design source of truth.
- The guide already formalizes the rules that were missing in the earlier audit:
  - do not redefine `*`, `body`, `.page-wrapper`, or heading defaults in page-specific CSS
  - use `.btn` plus semantic modifiers instead of page-specific button systems
  - use `translateY(-2px)` for button hover, not `scale()`
  - use one canonical `@keyframes fadeIn`
  - treat `#d7e2f1` as the de-facto soft blue border token
  - reuse four canonical callout types: `why-important`, `tip`, `task`, `error-list-manual`
- `resources.css` and `resources.html` are now aligned with the guide:
  - no duplicated base styles
  - no duplicated `.resource-section`
  - no custom `.main-btn` system
  - resource links and bottom navigation use canonical `.btn` classes
  - `.resource-item` now uses a neutral resource-card treatment instead of the pedagogical `tips / why-important` palette
- `accessibility.css` now uses the canonical `btn-info` color family for the floating toggle and panel header.
- The guide now clearly separates:
  - warm `info state` for system feedback
  - blue `why-important` / `tips` callouts for pedagogical guidance
- `ravlyk-open-issues.md` correctly narrows scope to implementation issues still present in code.

## What Is Still Open

- The shared token layer exists now, but more page-specific raw values can still be migrated to it over time.

## What To Do First In Code

1. Continue replacing remaining repeated raw values with named global tokens when touching related files.
2. Expand the token layer only when a value is clearly shared across multiple pages, not for one-off decoration.
3. Keep pedagogical callouts and neutral resource cards semantically separate in future CSS changes.
