# Color, Background, and Random Commands Implementation Spec

Snapshot date: 2026-03-09

## Purpose

This document fixes the agreed staged plan for the next language/runtime expansion:

- more available colors,
- a `фон` command for canvas background color,
- `випадково` support for colors and selected numeric commands,
- safer random behavior near canvas boundaries.

These changes are intentionally not scheduled as one large delivery.
The implementation should proceed in small, test-backed batches to keep parser/runtime behavior predictable and to avoid avoidable technical debt.

## Why this is staged

The current architecture is ready for extension, but the feature set spans several layers:

- parser grammar,
- AST statement model,
- runtime state,
- drawing/canvas lifecycle,
- save/export behavior,
- manual/lesson documentation,
- test coverage.

Bundling all of that into one patch would raise regression risk in the editor, runtime, and documentation.

## Agreed rollout order

### Phase 1. Expand and normalize color support

This is the current recommended implementation slice.

Scope:
- increase the number of supported colors,
- organize color definitions into a cleaner single-source structure,
- keep current `колір <назва>` behavior stable,
- avoid changing language grammar beyond color-name support,
- prepare the codebase for later `фон` and `випадково` work.

Required engineering outcomes:
- replace ad hoc color-list maintenance with a canonical color registry,
- derive runtime color map and canonical Ukrainian labels from that registry,
- preserve existing aliases such as English names and current Ukrainian names,
- keep `веселка` as a special supported color mode,
- avoid duplicating color knowledge across runtime and docs where practical.

Recommended data-model rule for this phase:
- each color should have one canonical internal entry,
- user-facing synonyms should be stored as aliases of that entry,
- group labels should exist for docs/UI organization only,
- `hex` should be the single stored color value unless a later feature truly needs another format,
- `rgb` should not be stored by default because it duplicates `hex`,
- the old `has: true` idea should be normalized to a clearer flag such as `core: true`.

Required tests:
- parser/runtime tests for newly added color names,
- unknown-color regression coverage,
- helper/runtime coverage for canonical name and alias resolution,
- documentation update checks where existing tests already validate static content.

Definition of done:
- new colors are accepted by `колір`,
- old supported colors still work,
- no runtime behavior changes outside color resolution,
- technical and user-facing docs list the supported palette consistently enough to avoid drift.

### Phase 1.1 Candidate normalized palette shape

Recommended registry shape:

```js
{
  name: "жовтогарячий",
  hex: "#FF8C00",
  group: "Помаранчеві",
  core: true,
  aliases: ["помаранчевий", "orange"]
}
```

Recommended interpretation:
- `name` is the canonical language/runtime name,
- `aliases` are accepted command inputs that resolve to the same canonical entry,
- `group` is for documentation/UI grouping,
- `core` marks the beginner-safe palette that should be highlighted in docs/examples first.

### Phase 1.2 Candidate palette normalization notes

The following decisions are currently recommended for implementation prep:

1. Keep these as canonical core colors:
- `білий`
- `чорний`
- `червоний`
- `рожевий`
- `жовтий`
- `жовтогарячий`
- `зелений`
- `синій`
- `фіолетовий`
- `коричневий`

2. Keep these as useful extended colors:
- `світло-сірий`
- `сірий`
- `темно-сірий`
- `кораловий`
- `малиновий`
- `бордовий`
- `персиковий`
- `теракотовий`
- `кремовий`
- `лимонний`
- `золотий`
- `гірчичний`
- `салатовий`
- `смарагдовий`
- `темно-зелений`
- `оливковий`
- `хакі`
- `блакитний`
- `небесний`
- `темно-синій`
- `індиго`
- `морський`
- `бузковий`
- `ліловий`
- `пурпуровий`
- `сливовий`
- `пісочний`
- `шоколадний`
- `каштановий`
- `бежевий`

3. Prefer aliases over near-duplicate standalone colors where meaning overlaps strongly.

Current recommendations:
- canonical `жовтогарячий`, alias `помаранчевий`
- decide whether `голубий` should be a canonical separate color or an alias of `блакитний`
- avoid long beginner-hostile command names where a shorter equivalent exists
- prefer `бежевий` over `кремово-бежевий` as a command name

4. Re-check a few color/value choices before implementation.

Current cautions:
- `золотий` should not reuse the same value as ordinary orange if we want the name to stay trustworthy
- blue-family names should be semantically separated clearly enough to be understandable in manual/examples
- every canonical Ukrainian color should keep an English alias only if backward compatibility or tests benefit from it

### Phase 1.3 Draft normalized registry for implementation

This draft is intended as the safest next-step source for `js/modules/constants.js`.
It is not yet a promise that every entry must be shown equally in the public manual.

```js
export const COLOR_REGISTRY = [
  { name: "білий",         hex: "#FFFFFF", group: "Ахроматичні",           core: true,  aliases: ["white"] },
  { name: "світло-сірий",  hex: "#D0D3DC", group: "Ахроматичні",           core: false, aliases: ["light-gray", "light-grey"] },
  { name: "сірий",         hex: "#8A8F9E", group: "Ахроматичні",           core: false, aliases: ["gray", "grey"] },
  { name: "темно-сірий",   hex: "#4A4E5C", group: "Ахроматичні",           core: false, aliases: ["dark-gray", "dark-grey"] },
  { name: "чорний",        hex: "#1A1A1A", group: "Ахроматичні",           core: true,  aliases: ["black"] },

  { name: "рожевий",       hex: "#FF82AC", group: "Червоні",               core: true,  aliases: ["pink"] },
  { name: "кораловий",     hex: "#FF6B5B", group: "Червоні",               core: false, aliases: ["coral"] },
  { name: "червоний",      hex: "#E8302A", group: "Червоні",               core: true,  aliases: ["red"] },
  { name: "малиновий",     hex: "#C0183A", group: "Червоні",               core: false, aliases: ["crimson"] },
  { name: "бордовий",      hex: "#7A1030", group: "Червоні",               core: false, aliases: ["burgundy", "maroon"] },
  { name: "вишневий",      hex: "#5C0E28", group: "Червоні",               core: false, aliases: ["cherry"] },

  { name: "персиковий",    hex: "#FFBD9B", group: "Помаранчеві",           core: false, aliases: ["peach"] },
  { name: "жовтогарячий",  hex: "#FF8C00", group: "Помаранчеві",           core: true,  aliases: ["помаранчевий", "orange"] },
  { name: "теракотовий",   hex: "#C45830", group: "Помаранчеві",           core: false, aliases: ["terracotta"] },

  { name: "кремовий",      hex: "#FFF8DC", group: "Жовті",                 core: false, aliases: ["cream"] },
  { name: "лимонний",      hex: "#FFF44F", group: "Жовті",                 core: false, aliases: ["lemon"] },
  { name: "жовтий",        hex: "#FFD600", group: "Жовті",                 core: true,  aliases: ["yellow"] },
  { name: "золотий",       hex: "#D4AF37", group: "Жовті",                 core: false, aliases: ["gold", "golden"] },
  { name: "гірчичний",     hex: "#C8900A", group: "Жовті",                 core: false, aliases: ["mustard"] },

  { name: "салатовий",     hex: "#A8E063", group: "Зелені",                core: false, aliases: ["lime"] },
  { name: "зелений",       hex: "#2ECC40", group: "Зелені",                core: true,  aliases: ["green"] },
  { name: "смарагдовий",   hex: "#00A878", group: "Зелені",                core: false, aliases: ["emerald"] },
  { name: "темно-зелений", hex: "#1A7A3C", group: "Зелені",                core: false, aliases: ["dark-green"] },
  { name: "оливковий",     hex: "#6B7C3A", group: "Зелені",                core: false, aliases: ["olive"] },
  { name: "хакі",          hex: "#8B8B4E", group: "Зелені",                core: false, aliases: ["khaki"] },

  { name: "блакитний",     hex: "#87CEEB", group: "Блакитні та сині",      core: false, aliases: ["голубий", "sky-blue", "light-blue"] },
  { name: "небесний",      hex: "#4FC3F7", group: "Блакитні та сині",      core: false, aliases: ["azure", "sky"] },
  { name: "синій",         hex: "#1A56DB", group: "Блакитні та сині",      core: true,  aliases: ["blue"] },
  { name: "темно-синій",   hex: "#0A2472", group: "Блакитні та сині",      core: false, aliases: ["dark-blue", "navy"] },
  { name: "індиго",        hex: "#3F0080", group: "Блакитні та сині",      core: false, aliases: ["indigo"] },
  { name: "морський",      hex: "#006994", group: "Блакитні та сині",      core: false, aliases: ["sea-blue", "teal-blue"] },

  { name: "бузковий",      hex: "#DDA0DD", group: "Фіолетові",             core: false, aliases: ["lavender"] },
  { name: "ліловий",       hex: "#B57BDC", group: "Фіолетові",             core: false, aliases: ["lilac"] },
  { name: "фіолетовий",    hex: "#7B2FBE", group: "Фіолетові",             core: true,  aliases: ["purple", "violet"] },
  { name: "пурпуровий",    hex: "#9B0060", group: "Фіолетові",             core: false, aliases: ["magenta"] },
  { name: "сливовий",      hex: "#5C0F5C", group: "Фіолетові",             core: false, aliases: ["plum"] },

  { name: "бежевий",       hex: "#F5DEB3", group: "Коричневі та земляні",  core: false, aliases: ["beige", "кремово-бежевий"] },
  { name: "пісочний",      hex: "#D4A855", group: "Коричневі та земляні",  core: false, aliases: ["sand", "sandy"] },
  { name: "коричневий",    hex: "#8B4513", group: "Коричневі та земляні",  core: true,  aliases: ["brown"] },
  { name: "шоколадний",    hex: "#5C2C0A", group: "Коричневі та земляні",  core: false, aliases: ["chocolate"] },
  { name: "каштановий",    hex: "#954535", group: "Коричневі та земляні",  core: false, aliases: ["chestnut"] },

  { name: "веселка",       hex: "RAINBOW", group: "Спеціальні",            core: true,  aliases: ["rainbow"] }
];
```

Implementation-prep notes:
- `веселка` should stay in the registry only as a special-case mode marker, not a normal hex color.
- alias lookup should be normalized to lowercase before resolution.
- the runtime-facing `COLOR_MAP` can be generated from `COLOR_REGISTRY`.
- the doc-facing list of beginner colors can be generated from `core: true`.
- if later UI work needs palettes by group, the same registry can power that without adding a second source of truth.

### Phase 1.4 Backward-compatibility expectations for the registry

When Phase 1 is implemented from the draft above:

1. Existing commands must keep working:
- `колір червоний`
- `колір синій`
- `колір зелений`
- `колір жовтий`
- `колір чорний`
- `колір білий`
- `колір рожевий`
- `колір коричневий`
- `колір фіолетовий`
- `колір веселка`

2. Existing English compatibility should remain where already supported or obviously helpful:
- `red`
- `green`
- `blue`
- `black`
- `yellow`
- `orange`
- `purple`
- `pink`
- `brown`
- `white`
- `rainbow`

3. New names should be added without changing the meaning of old names.

### Phase 2. Add canvas background state and `фон`

Scope:
- add a language command `фон <колір>`,
- allow `фон випадково` in the same phase only if the background-state infrastructure is already complete,
- introduce persistent canvas background state in interpreter/runtime.

Required engineering outcomes:
- background color must live in runtime state, not only in CSS,
- `reset`, `clear`, resize restore, and image export must all use the same background source of truth,
- parser/runtime should treat background changes as an explicit statement type, not as a hidden branch of `колір`.

Required tests:
- parser AST coverage for `фон`,
- runtime tests for background persistence across clear/reset flows,
- export/save regression test coverage,
- E2E smoke confirming the visible canvas background changes.

Definition of done:
- `фон синій` reliably changes the canvas background,
- background remains coherent after `очистити`, resize, and download,
- no duplicated background state across CSS/runtime/export paths.

### Phase 3. Add controlled `випадково` for colors

Scope:
- support `колір випадково`,
- support `фон випадково` after Phase 2 is complete.

Required engineering outcomes:
- random color selection must use the canonical color registry,
- random color logic must be centralized in a helper/module rather than scattered `Math.random()` calls,
- rainbow mode should stay explicit and should not be silently mixed into ordinary random color selection unless intentionally specified.

Required tests:
- deterministic tests using injected or stubbed RNG,
- regression tests ensuring only supported colors are selected,
- runtime tests ensuring the chosen color is applied correctly.

Definition of done:
- random color commands are testable and deterministic under test control,
- runtime does not depend on unmocked randomness in unit tests.

### Phase 4. Add controlled `випадково` for numeric movement/position

Scope:
- support `вперед випадково`,
- support `назад випадково`,
- support `перейти в випадково`.

Non-goal for this phase:
- broad random-expression support in all arithmetic expressions.

Required engineering outcomes:
- do not implement this as scattered command-specific hacks,
- introduce a clear AST/runtime representation for random command arguments,
- centralize safe random coordinate/distance generation,
- use boundary-aware safe zones, not only raw canvas clamping.

Safety rule agreed for this feature:
- random values should try to keep the snail out of the boundary zone and also away from the edge by roughly 100 px where possible,
- the purpose is user safety and fewer frustrating boundary warnings, not mathematically maximum movement.

Implementation note:
- `перейти в випадково` should be treated as a dedicated semantic form, not as two missing numeric arguments,
- movement randomness must consider current position, current direction, and canvas-safe margins.

Required tests:
- parser tests for accepted/rejected random command forms,
- helper tests for safe coordinate/distance generation,
- boundary regression tests proving the generated values stay inside the safe zone,
- E2E smoke for visible execution without edge collisions in normal canvas sizes.

Definition of done:
- random movement and goto behave safely for typical classroom/editor usage,
- random behavior is still predictable enough to explain in docs and tests,
- boundary regressions remain covered.

## Architecture rules for all phases

1. Prefer AST-first implementation.
- New language behavior should enter through the current AST pipeline, not through legacy-only shortcuts.

2. Centralize feature logic.
- Random resolution, color registry data, and background state should each have one clear owner module or abstraction.

3. Preserve friendly errors.
- Any new syntax must keep the existing standard of understandable parser/runtime errors.

4. Avoid silent semantic overload.
- `фон` should remain distinct from `колір`.
- Random forms should be explicit and testable, not implicit parser magic.

5. Keep documentation truthful.
- Do not document a command in the public manual until the behavior is implemented and test-covered.

## Immediate next implementation target

The next code batch should be limited to Phase 1:

- expand supported colors,
- reorganize color definitions,
- add tests for the expanded palette,
- update docs only for the new palette structure and supported names.

`фон` and all `випадково` behavior remain intentionally deferred until the supporting runtime and test structure is ready.
