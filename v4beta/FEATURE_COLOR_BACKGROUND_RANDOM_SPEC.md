# Color, Background, and Random Commands Implementation Spec

Snapshot date: 2026-03-09

## Purpose

This document fixes the agreed staged plan for the next language/runtime expansion:

- more available colors,
- a `РЎвЂћР С•Р Р…` command for canvas background color,
- `Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•` support for colors and selected numeric commands,
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
- keep current `Р С”Р С•Р В»РЎвЂ“РЎР‚ <Р Р…Р В°Р В·Р Р†Р В°>` behavior stable,
- avoid changing language grammar beyond color-name support,
- prepare the codebase for later `РЎвЂћР С•Р Р…` and `Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•` work.

Required engineering outcomes:
- replace ad hoc color-list maintenance with a canonical color registry,
- derive runtime color map and canonical Ukrainian labels from that registry,
- preserve existing aliases such as English names and current Ukrainian names,
- keep `Р Р†Р ВµРЎРѓР ВµР В»Р С”Р В°` as a special supported color mode,
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
- new colors are accepted by `Р С”Р С•Р В»РЎвЂ“РЎР‚`,
- old supported colors still work,
- no runtime behavior changes outside color resolution,
- technical and user-facing docs list the supported palette consistently enough to avoid drift.

### Phase 1.1 Candidate normalized palette shape

Recommended registry shape:

```js
{
  name: "Р В¶Р С•Р Р†РЎвЂљР С•Р С–Р В°РЎР‚РЎРЏРЎвЂЎР С‘Р в„–",
  hex: "#FF8C00",
  group: "Р СџР С•Р СР В°РЎР‚Р В°Р Р…РЎвЂЎР ВµР Р†РЎвЂ“",
  core: true,
  aliases: ["Р С—Р С•Р СР В°РЎР‚Р В°Р Р…РЎвЂЎР ВµР Р†Р С‘Р в„–", "orange"]
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
- `Р В±РЎвЂ“Р В»Р С‘Р в„–`
- `РЎвЂЎР С•РЎР‚Р Р…Р С‘Р в„–`
- `РЎвЂЎР ВµРЎР‚Р Р†Р С•Р Р…Р С‘Р в„–`
- `РЎР‚Р С•Р В¶Р ВµР Р†Р С‘Р в„–`
- `Р В¶Р С•Р Р†РЎвЂљР С‘Р в„–`
- `Р В¶Р С•Р Р†РЎвЂљР С•Р С–Р В°РЎР‚РЎРЏРЎвЂЎР С‘Р в„–`
- `Р В·Р ВµР В»Р ВµР Р…Р С‘Р в„–`
- `РЎРѓР С‘Р Р…РЎвЂ“Р в„–`
- `РЎвЂћРЎвЂ“Р С•Р В»Р ВµРЎвЂљР С•Р Р†Р С‘Р в„–`
- `Р С”Р С•РЎР‚Р С‘РЎвЂЎР Р…Р ВµР Р†Р С‘Р в„–`

2. Keep these as useful extended colors:
- `РЎРѓР Р†РЎвЂ“РЎвЂљР В»Р С•-РЎРѓРЎвЂ“РЎР‚Р С‘Р в„–`
- `РЎРѓРЎвЂ“РЎР‚Р С‘Р в„–`
- `РЎвЂљР ВµР СР Р…Р С•-РЎРѓРЎвЂ“РЎР‚Р С‘Р в„–`
- `Р С”Р С•РЎР‚Р В°Р В»Р С•Р Р†Р С‘Р в„–`
- `Р СР В°Р В»Р С‘Р Р…Р С•Р Р†Р С‘Р в„–`
- `Р В±Р С•РЎР‚Р Т‘Р С•Р Р†Р С‘Р в„–`
- `Р С—Р ВµРЎР‚РЎРѓР С‘Р С”Р С•Р Р†Р С‘Р в„–`
- `РЎвЂљР ВµРЎР‚Р В°Р С”Р С•РЎвЂљР С•Р Р†Р С‘Р в„–`
- `Р С”РЎР‚Р ВµР СР С•Р Р†Р С‘Р в„–`
- `Р В»Р С‘Р СР С•Р Р…Р Р…Р С‘Р в„–`
- `Р В·Р С•Р В»Р С•РЎвЂљР С‘Р в„–`
- `Р С–РЎвЂ“РЎР‚РЎвЂЎР С‘РЎвЂЎР Р…Р С‘Р в„–`
- `РЎРѓР В°Р В»Р В°РЎвЂљР С•Р Р†Р С‘Р в„–`
- `РЎРѓР СР В°РЎР‚Р В°Р С–Р Т‘Р С•Р Р†Р С‘Р в„–`
- `РЎвЂљР ВµР СР Р…Р С•-Р В·Р ВµР В»Р ВµР Р…Р С‘Р в„–`
- `Р С•Р В»Р С‘Р Р†Р С”Р С•Р Р†Р С‘Р в„–`
- `РЎвЂ¦Р В°Р С”РЎвЂ“`
- `Р В±Р В»Р В°Р С”Р С‘РЎвЂљР Р…Р С‘Р в„–`
- `Р Р…Р ВµР В±Р ВµРЎРѓР Р…Р С‘Р в„–`
- `РЎвЂљР ВµР СР Р…Р С•-РЎРѓР С‘Р Р…РЎвЂ“Р в„–`
- `РЎвЂ“Р Р…Р Т‘Р С‘Р С–Р С•`
- `Р СР С•РЎР‚РЎРѓРЎРЉР С”Р С‘Р в„–`
- `Р В±РЎС“Р В·Р С”Р С•Р Р†Р С‘Р в„–`
- `Р В»РЎвЂ“Р В»Р С•Р Р†Р С‘Р в„–`
- `Р С—РЎС“РЎР‚Р С—РЎС“РЎР‚Р С•Р Р†Р С‘Р в„–`
- `РЎРѓР В»Р С‘Р Р†Р С•Р Р†Р С‘Р в„–`
- `Р С—РЎвЂ“РЎРѓР С•РЎвЂЎР Р…Р С‘Р в„–`
- `РЎв‚¬Р С•Р С”Р С•Р В»Р В°Р Т‘Р Р…Р С‘Р в„–`
- `Р С”Р В°РЎв‚¬РЎвЂљР В°Р Р…Р С•Р Р†Р С‘Р в„–`
- `Р В±Р ВµР В¶Р ВµР Р†Р С‘Р в„–`

3. Prefer aliases over near-duplicate standalone colors where meaning overlaps strongly.

Current recommendations:
- canonical `Р В¶Р С•Р Р†РЎвЂљР С•Р С–Р В°РЎР‚РЎРЏРЎвЂЎР С‘Р в„–`, alias `Р С—Р С•Р СР В°РЎР‚Р В°Р Р…РЎвЂЎР ВµР Р†Р С‘Р в„–`
- decide whether `Р С–Р С•Р В»РЎС“Р В±Р С‘Р в„–` should be a canonical separate color or an alias of `Р В±Р В»Р В°Р С”Р С‘РЎвЂљР Р…Р С‘Р в„–`
- avoid long beginner-hostile command names where a shorter equivalent exists
- prefer `Р В±Р ВµР В¶Р ВµР Р†Р С‘Р в„–` over `Р С”РЎР‚Р ВµР СР С•Р Р†Р С•-Р В±Р ВµР В¶Р ВµР Р†Р С‘Р в„–` as a command name

4. Re-check a few color/value choices before implementation.

Current cautions:
- `Р В·Р С•Р В»Р С•РЎвЂљР С‘Р в„–` should not reuse the same value as ordinary orange if we want the name to stay trustworthy
- blue-family names should be semantically separated clearly enough to be understandable in manual/examples
- every canonical Ukrainian color should keep an English alias only if backward compatibility or tests benefit from it

### Phase 1.3 Draft normalized registry for implementation

This draft is intended as the safest next-step source for `js/modules/constants.js`.
It is not yet a promise that every entry must be shown equally in the public manual.

```js
export const COLOR_REGISTRY = [
  { name: "Р В±РЎвЂ“Р В»Р С‘Р в„–",         hex: "#FFFFFF", group: "Р С’РЎвЂ¦РЎР‚Р С•Р СР В°РЎвЂљР С‘РЎвЂЎР Р…РЎвЂ“",           core: true,  aliases: ["white"] },
  { name: "РЎРѓР Р†РЎвЂ“РЎвЂљР В»Р С•-РЎРѓРЎвЂ“РЎР‚Р С‘Р в„–",  hex: "#D0D3DC", group: "Р С’РЎвЂ¦РЎР‚Р С•Р СР В°РЎвЂљР С‘РЎвЂЎР Р…РЎвЂ“",           core: false, aliases: ["light-gray", "light-grey"] },
  { name: "РЎРѓРЎвЂ“РЎР‚Р С‘Р в„–",         hex: "#8A8F9E", group: "Р С’РЎвЂ¦РЎР‚Р С•Р СР В°РЎвЂљР С‘РЎвЂЎР Р…РЎвЂ“",           core: false, aliases: ["gray", "grey"] },
  { name: "РЎвЂљР ВµР СР Р…Р С•-РЎРѓРЎвЂ“РЎР‚Р С‘Р в„–",   hex: "#4A4E5C", group: "Р С’РЎвЂ¦РЎР‚Р С•Р СР В°РЎвЂљР С‘РЎвЂЎР Р…РЎвЂ“",           core: false, aliases: ["dark-gray", "dark-grey"] },
  { name: "РЎвЂЎР С•РЎР‚Р Р…Р С‘Р в„–",        hex: "#1A1A1A", group: "Р С’РЎвЂ¦РЎР‚Р С•Р СР В°РЎвЂљР С‘РЎвЂЎР Р…РЎвЂ“",           core: true,  aliases: ["black"] },

  { name: "РЎР‚Р С•Р В¶Р ВµР Р†Р С‘Р в„–",       hex: "#FF82AC", group: "Р В§Р ВµРЎР‚Р Р†Р С•Р Р…РЎвЂ“",               core: true,  aliases: ["pink"] },
  { name: "Р С”Р С•РЎР‚Р В°Р В»Р С•Р Р†Р С‘Р в„–",     hex: "#FF6B5B", group: "Р В§Р ВµРЎР‚Р Р†Р С•Р Р…РЎвЂ“",               core: false, aliases: ["coral"] },
  { name: "РЎвЂЎР ВµРЎР‚Р Р†Р С•Р Р…Р С‘Р в„–",      hex: "#E8302A", group: "Р В§Р ВµРЎР‚Р Р†Р С•Р Р…РЎвЂ“",               core: true,  aliases: ["red"] },
  { name: "Р СР В°Р В»Р С‘Р Р…Р С•Р Р†Р С‘Р в„–",     hex: "#C0183A", group: "Р В§Р ВµРЎР‚Р Р†Р С•Р Р…РЎвЂ“",               core: false, aliases: ["crimson"] },
  { name: "Р В±Р С•РЎР‚Р Т‘Р С•Р Р†Р С‘Р в„–",      hex: "#7A1030", group: "Р В§Р ВµРЎР‚Р Р†Р С•Р Р…РЎвЂ“",               core: false, aliases: ["burgundy", "maroon"] },
  { name: "Р Р†Р С‘РЎв‚¬Р Р…Р ВµР Р†Р С‘Р в„–",      hex: "#5C0E28", group: "Р В§Р ВµРЎР‚Р Р†Р С•Р Р…РЎвЂ“",               core: false, aliases: ["cherry"] },

  { name: "Р С—Р ВµРЎР‚РЎРѓР С‘Р С”Р С•Р Р†Р С‘Р в„–",    hex: "#FFBD9B", group: "Р СџР С•Р СР В°РЎР‚Р В°Р Р…РЎвЂЎР ВµР Р†РЎвЂ“",           core: false, aliases: ["peach"] },
  { name: "Р В¶Р С•Р Р†РЎвЂљР С•Р С–Р В°РЎР‚РЎРЏРЎвЂЎР С‘Р в„–",  hex: "#FF8C00", group: "Р СџР С•Р СР В°РЎР‚Р В°Р Р…РЎвЂЎР ВµР Р†РЎвЂ“",           core: true,  aliases: ["Р С—Р С•Р СР В°РЎР‚Р В°Р Р…РЎвЂЎР ВµР Р†Р С‘Р в„–", "orange"] },
  { name: "РЎвЂљР ВµРЎР‚Р В°Р С”Р С•РЎвЂљР С•Р Р†Р С‘Р в„–",   hex: "#C45830", group: "Р СџР С•Р СР В°РЎР‚Р В°Р Р…РЎвЂЎР ВµР Р†РЎвЂ“",           core: false, aliases: ["terracotta"] },

  { name: "Р С”РЎР‚Р ВµР СР С•Р Р†Р С‘Р в„–",      hex: "#FFF8DC", group: "Р вЂ“Р С•Р Р†РЎвЂљРЎвЂ“",                 core: false, aliases: ["cream"] },
  { name: "Р В»Р С‘Р СР С•Р Р…Р Р…Р С‘Р в„–",      hex: "#FFF44F", group: "Р вЂ“Р С•Р Р†РЎвЂљРЎвЂ“",                 core: false, aliases: ["lemon"] },
  { name: "Р В¶Р С•Р Р†РЎвЂљР С‘Р в„–",        hex: "#FFD600", group: "Р вЂ“Р С•Р Р†РЎвЂљРЎвЂ“",                 core: true,  aliases: ["yellow"] },
  { name: "Р В·Р С•Р В»Р С•РЎвЂљР С‘Р в„–",       hex: "#D4AF37", group: "Р вЂ“Р С•Р Р†РЎвЂљРЎвЂ“",                 core: false, aliases: ["gold", "golden"] },
  { name: "Р С–РЎвЂ“РЎР‚РЎвЂЎР С‘РЎвЂЎР Р…Р С‘Р в„–",     hex: "#C8900A", group: "Р вЂ“Р С•Р Р†РЎвЂљРЎвЂ“",                 core: false, aliases: ["mustard"] },

  { name: "РЎРѓР В°Р В»Р В°РЎвЂљР С•Р Р†Р С‘Р в„–",     hex: "#A8E063", group: "Р вЂ”Р ВµР В»Р ВµР Р…РЎвЂ“",                core: false, aliases: ["lime"] },
  { name: "Р В·Р ВµР В»Р ВµР Р…Р С‘Р в„–",       hex: "#2ECC40", group: "Р вЂ”Р ВµР В»Р ВµР Р…РЎвЂ“",                core: true,  aliases: ["green"] },
  { name: "РЎРѓР СР В°РЎР‚Р В°Р С–Р Т‘Р С•Р Р†Р С‘Р в„–",   hex: "#00A878", group: "Р вЂ”Р ВµР В»Р ВµР Р…РЎвЂ“",                core: false, aliases: ["emerald"] },
  { name: "РЎвЂљР ВµР СР Р…Р С•-Р В·Р ВµР В»Р ВµР Р…Р С‘Р в„–", hex: "#1A7A3C", group: "Р вЂ”Р ВµР В»Р ВµР Р…РЎвЂ“",                core: false, aliases: ["dark-green"] },
  { name: "Р С•Р В»Р С‘Р Р†Р С”Р С•Р Р†Р С‘Р в„–",     hex: "#6B7C3A", group: "Р вЂ”Р ВµР В»Р ВµР Р…РЎвЂ“",                core: false, aliases: ["olive"] },
  { name: "РЎвЂ¦Р В°Р С”РЎвЂ“",          hex: "#8B8B4E", group: "Р вЂ”Р ВµР В»Р ВµР Р…РЎвЂ“",                core: false, aliases: ["khaki"] },

  { name: "Р В±Р В»Р В°Р С”Р С‘РЎвЂљР Р…Р С‘Р в„–",     hex: "#87CEEB", group: "Р вЂР В»Р В°Р С”Р С‘РЎвЂљР Р…РЎвЂ“ РЎвЂљР В° РЎРѓР С‘Р Р…РЎвЂ“",      core: false, aliases: ["Р С–Р С•Р В»РЎС“Р В±Р С‘Р в„–", "sky-blue", "light-blue"] },
  { name: "Р Р…Р ВµР В±Р ВµРЎРѓР Р…Р С‘Р в„–",      hex: "#4FC3F7", group: "Р вЂР В»Р В°Р С”Р С‘РЎвЂљР Р…РЎвЂ“ РЎвЂљР В° РЎРѓР С‘Р Р…РЎвЂ“",      core: false, aliases: ["azure", "sky"] },
  { name: "РЎРѓР С‘Р Р…РЎвЂ“Р в„–",         hex: "#1A56DB", group: "Р вЂР В»Р В°Р С”Р С‘РЎвЂљР Р…РЎвЂ“ РЎвЂљР В° РЎРѓР С‘Р Р…РЎвЂ“",      core: true,  aliases: ["blue"] },
  { name: "РЎвЂљР ВµР СР Р…Р С•-РЎРѓР С‘Р Р…РЎвЂ“Р в„–",   hex: "#0A2472", group: "Р вЂР В»Р В°Р С”Р С‘РЎвЂљР Р…РЎвЂ“ РЎвЂљР В° РЎРѓР С‘Р Р…РЎвЂ“",      core: false, aliases: ["dark-blue", "navy"] },
  { name: "РЎвЂ“Р Р…Р Т‘Р С‘Р С–Р С•",        hex: "#3F0080", group: "Р вЂР В»Р В°Р С”Р С‘РЎвЂљР Р…РЎвЂ“ РЎвЂљР В° РЎРѓР С‘Р Р…РЎвЂ“",      core: false, aliases: ["indigo"] },
  { name: "Р СР С•РЎР‚РЎРѓРЎРЉР С”Р С‘Р в„–",      hex: "#006994", group: "Р вЂР В»Р В°Р С”Р С‘РЎвЂљР Р…РЎвЂ“ РЎвЂљР В° РЎРѓР С‘Р Р…РЎвЂ“",      core: false, aliases: ["sea-blue", "teal-blue"] },

  { name: "Р В±РЎС“Р В·Р С”Р С•Р Р†Р С‘Р в„–",      hex: "#DDA0DD", group: "Р В¤РЎвЂ“Р С•Р В»Р ВµРЎвЂљР С•Р Р†РЎвЂ“",             core: false, aliases: ["lavender"] },
  { name: "Р В»РЎвЂ“Р В»Р С•Р Р†Р С‘Р в„–",       hex: "#B57BDC", group: "Р В¤РЎвЂ“Р С•Р В»Р ВµРЎвЂљР С•Р Р†РЎвЂ“",             core: false, aliases: ["lilac"] },
  { name: "РЎвЂћРЎвЂ“Р С•Р В»Р ВµРЎвЂљР С•Р Р†Р С‘Р в„–",    hex: "#7B2FBE", group: "Р В¤РЎвЂ“Р С•Р В»Р ВµРЎвЂљР С•Р Р†РЎвЂ“",             core: true,  aliases: ["purple", "violet"] },
  { name: "Р С—РЎС“РЎР‚Р С—РЎС“РЎР‚Р С•Р Р†Р С‘Р в„–",    hex: "#9B0060", group: "Р В¤РЎвЂ“Р С•Р В»Р ВµРЎвЂљР С•Р Р†РЎвЂ“",             core: false, aliases: ["magenta"] },
  { name: "РЎРѓР В»Р С‘Р Р†Р С•Р Р†Р С‘Р в„–",      hex: "#5C0F5C", group: "Р В¤РЎвЂ“Р С•Р В»Р ВµРЎвЂљР С•Р Р†РЎвЂ“",             core: false, aliases: ["plum"] },

  { name: "Р В±Р ВµР В¶Р ВµР Р†Р С‘Р в„–",       hex: "#F5DEB3", group: "Р С™Р С•РЎР‚Р С‘РЎвЂЎР Р…Р ВµР Р†РЎвЂ“ РЎвЂљР В° Р В·Р ВµР СР В»РЎРЏР Р…РЎвЂ“",  core: false, aliases: ["beige", "Р С”РЎР‚Р ВµР СР С•Р Р†Р С•-Р В±Р ВµР В¶Р ВµР Р†Р С‘Р в„–"] },
  { name: "Р С—РЎвЂ“РЎРѓР С•РЎвЂЎР Р…Р С‘Р в„–",      hex: "#D4A855", group: "Р С™Р С•РЎР‚Р С‘РЎвЂЎР Р…Р ВµР Р†РЎвЂ“ РЎвЂљР В° Р В·Р ВµР СР В»РЎРЏР Р…РЎвЂ“",  core: false, aliases: ["sand", "sandy"] },
  { name: "Р С”Р С•РЎР‚Р С‘РЎвЂЎР Р…Р ВµР Р†Р С‘Р в„–",    hex: "#8B4513", group: "Р С™Р С•РЎР‚Р С‘РЎвЂЎР Р…Р ВµР Р†РЎвЂ“ РЎвЂљР В° Р В·Р ВµР СР В»РЎРЏР Р…РЎвЂ“",  core: true,  aliases: ["brown"] },
  { name: "РЎв‚¬Р С•Р С”Р С•Р В»Р В°Р Т‘Р Р…Р С‘Р в„–",    hex: "#5C2C0A", group: "Р С™Р С•РЎР‚Р С‘РЎвЂЎР Р…Р ВµР Р†РЎвЂ“ РЎвЂљР В° Р В·Р ВµР СР В»РЎРЏР Р…РЎвЂ“",  core: false, aliases: ["chocolate"] },
  { name: "Р С”Р В°РЎв‚¬РЎвЂљР В°Р Р…Р С•Р Р†Р С‘Р в„–",    hex: "#954535", group: "Р С™Р С•РЎР‚Р С‘РЎвЂЎР Р…Р ВµР Р†РЎвЂ“ РЎвЂљР В° Р В·Р ВµР СР В»РЎРЏР Р…РЎвЂ“",  core: false, aliases: ["chestnut"] },

  { name: "Р Р†Р ВµРЎРѓР ВµР В»Р С”Р В°",       hex: "RAINBOW", group: "Р РЋР С—Р ВµРЎвЂ РЎвЂ“Р В°Р В»РЎРЉР Р…РЎвЂ“",            core: true,  aliases: ["rainbow"] }
];
```

Implementation-prep notes:
- `Р Р†Р ВµРЎРѓР ВµР В»Р С”Р В°` should stay in the registry only as a special-case mode marker, not a normal hex color.
- alias lookup should be normalized to lowercase before resolution.
- the runtime-facing `COLOR_MAP` can be generated from `COLOR_REGISTRY`.
- the doc-facing list of beginner colors can be generated from `core: true`.
- if later UI work needs palettes by group, the same registry can power that without adding a second source of truth.

### Phase 1.4 Backward-compatibility expectations for the registry

When Phase 1 is implemented from the draft above:

1. Existing commands must keep working:
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ РЎвЂЎР ВµРЎР‚Р Р†Р С•Р Р…Р С‘Р в„–`
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ РЎРѓР С‘Р Р…РЎвЂ“Р в„–`
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ Р В·Р ВµР В»Р ВµР Р…Р С‘Р в„–`
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ Р В¶Р С•Р Р†РЎвЂљР С‘Р в„–`
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ РЎвЂЎР С•РЎР‚Р Р…Р С‘Р в„–`
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ Р В±РЎвЂ“Р В»Р С‘Р в„–`
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ РЎР‚Р С•Р В¶Р ВµР Р†Р С‘Р в„–`
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ Р С”Р С•РЎР‚Р С‘РЎвЂЎР Р…Р ВµР Р†Р С‘Р в„–`
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ РЎвЂћРЎвЂ“Р С•Р В»Р ВµРЎвЂљР С•Р Р†Р С‘Р в„–`
- `Р С”Р С•Р В»РЎвЂ“РЎР‚ Р Р†Р ВµРЎРѓР ВµР В»Р С”Р В°`

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

Status:
- Implemented in the current codebase as a staged underlay-based background feature.
- `фон` now targets a background layer, `очистити` restores a default white sheet, and export/resize use the same background source of truth.
- `фон випадково` is now implemented together with controlled random color selection.

Scope:
- add a language command `фон <колір>`,
- allow `фон випадково` in the same phase only if the background-state infrastructure is already complete,
- introduce persistent canvas background state in interpreter/runtime.

Agreed semantic decision for this phase:
- `фон` changes the canvas underlay/background layer and must not repaint or destroy already drawn lines.
- Sequential background commands are valid, but without pauses the learner will usually perceive only the final background color.
- `очистити` should clear the drawing and restore the background to the default beginner state (white canvas).
- `reset` should remain the broader full-state reset: default background, cleared drawing, default turtle position/direction, and default drawing state.

Recommended mental model for users:
- `колір` = what the snail draws with.
- `фон` = what the snail draws on.
- `очистити` = return the canvas to a clean sheet.
- `reset` = return the whole interpreter/session state to its starting point.

Required engineering outcomes:
- background color must live in runtime state, not only in CSS,
- `reset`, `clear`, resize restore, and image export must all use the same background source of truth,
- parser/runtime should treat background changes as an explicit statement type, not as a hidden branch of `колір`.
- the runtime architecture should move toward a true background-underlay model rather than a repaint-over-drawing model,
- `очистити` must have explicit default-background behavior instead of inheriting the last custom background.

Required tests:
- parser AST coverage for `фон`,
- runtime tests proving that background changes do not erase existing drawing content,
- runtime tests proving that `очистити` restores the default background,
- runtime tests proving that `reset` restores the full default state,
- export/save regression test coverage,
- E2E smoke confirming the visible canvas background changes.

Definition of done:
- `фон синій` reliably changes the canvas background,
- existing drawing remains visible after `фон синій`,
- `очистити` returns the user to a default clean white sheet,
- background remains coherent after resize and download,
- no duplicated background state across CSS/runtime/export paths.

### Phase 3. Add controlled `Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•` for colors

Scope:
- support `Р С”Р С•Р В»РЎвЂ“РЎР‚ Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•`,
- support `РЎвЂћР С•Р Р… Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•` after Phase 2 is complete.

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

Status:
- Implemented in the current codebase.
- `колір випадково` and `фон випадково` resolve through a centralized helper backed by `COLOR_REGISTRY`.
- `веселка` remains explicit-only and is not part of ordinary random color selection.

### Phase 4. Add controlled `Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•` for numeric movement/position

Scope:
- support `Р Р†Р С—Р ВµРЎР‚Р ВµР Т‘ Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•`,
- support `Р Р…Р В°Р В·Р В°Р Т‘ Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•`,
- support `Р С—Р ВµРЎР‚Р ВµР в„–РЎвЂљР С‘ Р Р† Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•`.

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
- `Р С—Р ВµРЎР‚Р ВµР в„–РЎвЂљР С‘ Р Р† Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•` should be treated as a dedicated semantic form, not as two missing numeric arguments,
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

Status:
- Implemented in the current codebase.
- `вперед випадково` and `назад випадково` resolve through a centralized safe-distance helper.
- `перейти в випадково` resolves through a centralized safe-point helper.
- The current implementation keeps random movement/position inside a boundary-aware safe zone instead of relying only on raw canvas clamping.

## Architecture rules for all phases

1. Prefer AST-first implementation.
- New language behavior should enter through the current AST pipeline, not through legacy-only shortcuts.

2. Centralize feature logic.
- Random resolution, color registry data, and background state should each have one clear owner module or abstraction.

3. Preserve friendly errors.
- Any new syntax must keep the existing standard of understandable parser/runtime errors.

4. Avoid silent semantic overload.
- `РЎвЂћР С•Р Р…` should remain distinct from `Р С”Р С•Р В»РЎвЂ“РЎР‚`.
- Random forms should be explicit and testable, not implicit parser magic.

5. Keep documentation truthful.
- Do not document a command in the public manual until the behavior is implemented and test-covered.

## Immediate next implementation target

The next code batch should be limited to Phase 1:

- expand supported colors,
- reorganize color definitions,
- add tests for the expanded palette,
- update docs only for the new palette structure and supported names.

`РЎвЂћР С•Р Р…` and all `Р Р†Р С‘Р С—Р В°Р Т‘Р С”Р С•Р Р†Р С•` behavior remain intentionally deferred until the supporting runtime and test structure is ready.
