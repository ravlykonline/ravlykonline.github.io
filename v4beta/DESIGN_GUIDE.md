# RAVLYK v4 Design Guide

This document is the primary visual/style reference for the repository.
If you are adding or updating UI, read this before inventing new styles.

Last updated: 2026-03-07

## 1. Purpose

The project already has an established visual language.
This guide exists so developers and AI agents:
- keep pages visually consistent,
- reuse existing UI patterns,
- avoid introducing one-off button styles, colors, spacing systems, or typography rules.

Primary visual reference pages:
- `index.html`
- `manual.html`

Supporting references:
- `css/global.css`
- `css/main-editor.css`
- `css/manual.css`

Secondary pages should align to these patterns unless there is a strong reason not to.

## 2. Design principles

- Friendly, educational, and clear.
- Bright but not noisy.
- Rounded, soft surfaces instead of sharp enterprise-style UI.
- Strong visual separation between actions, content blocks, and feedback states.
- Readability first: children, teachers, and beginners are core users.
- Accessibility is not optional. New UI must work with high-contrast mode, larger text, and keyboard navigation.

## 3. Canonical foundations

### 3.1 Base typography

Canonical body font:
- `'Nunito', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`

Canonical monospace font:
- `'Fira Mono', 'Consolas', 'Courier New', monospace`

Rules:
- Use the body stack for normal UI text.
- Use the monospace stack for code, commands, examples, coordinates, and inline code.
- Do not introduce a new display font unless the project is explicitly being rebranded.

### 3.2 Base page shell

From `css/global.css`:
- page background: `#f0f8ff`
- default text: `#333`
- content width: `.page-wrapper` max-width `900px`
- base body line-height: `1.6`

Use these defaults for standard content pages unless a page has an explicit local system like the editor workspace.

### 3.3 Heading language

Global heading color:
- `#4b0082`

Typical accent roles:
- primary heading/link purple: `#4b0082` / `#6a5acd`
- warm highlight/accent: `#ff6347`
- teal instructional accent: `#00796b`

Rule:
- New pages should feel like part of the same family. Default to purple for major headings and teal/tomato for secondary emphasis.

## 4. Core color system

These are the closest thing to project-wide design tokens today.

### 4.1 Action colors

From `css/global.css`:
- primary: `#6a5acd`
- primary hover: `#5849a9`
- success: `#32cd32`
- success hover: `#28a428`
- warning: `#ffb300`
- warning hover: `#e6a100`
- danger: `#c0392b`
- danger hover: `#a93226`
- info: `#2f6fbf`
- info hover: `#275fa4`

Meaning:
- `btn-primary`: navigation, secondary main actions, "go to page" buttons
- `btn-success`: run/open/start/confirm-positive actions
- `btn-warning`: pause/stop/caution actions
- `btn-danger`: destructive reset/clear/remove actions
- `btn-info`: export/share/download/help-adjacent utility actions

Do not remap these meanings casually.

### 4.2 Manual/content colors

From `css/manual.css`:
- command accent purple: `#6a5acd`
- command name teal: `#00796b`
- rule accent tomato: `#ff6347`
- success state bg: `#e8f5e9`
- success state text: `#2e7d32`
- info state bg: `#fff3e0`
- info state text: `#e65100`
- error state bg: `#ffebee`
- error state text: `#d32f2f`
- code block bg: `#f8f9fa`
- example result bg: `#fff9e6`

Use these when creating instructional callouts, examples, warnings, or “what to notice” blocks.

### 4.3 Accessibility colors

High-contrast mode is already defined and must remain supported:
- background: `#000`
- text: `#fff`
- highlight accent: `#ffe082`
- link accent: `#4dd0e1`

Rule:
- Any new component with a colored background should have a high-contrast override if its default colors would become unreadable.

## 5. Buttons

Canonical button class:
- `.btn`

Base button style from `css/global.css`:
- padding: `10px 20px`
- border radius: `8px`
- font size: `1rem`
- font weight: `bold`
- inline-flex centered layout
- shadow: `0 2px 4px rgba(0,0,0,0.1)`
- hover lift: translateY `-2px`

Rules:
- Reuse `.btn` plus a semantic modifier class.
- Do not create page-specific buttons if an existing semantic button class already fits.
- Keep icon usage consistent: left icon by default, right icon only for “next/forward” patterns.
- Disabled buttons should use the shared disabled behavior from `global.css`.

Preferred combinations:
- `.btn btn-primary`
- `.btn btn-success`
- `.btn btn-warning`
- `.btn btn-danger`
- `.btn btn-info`
- `.btn btn-secondary` only when the page already defines it and the action is truly secondary

## 6. Radius, shadows, and surfaces

Visual language:
- rounded corners are standard
- soft shadows, not harsh elevation

Canonical radii seen across the project:
- `8px` for buttons, inline surfaces, small panels
- `10px` for content panels/cards
- `12px` for modal containers and some larger surfaces
- `999px` or pill-like radius for tokens/badges when needed

Canonical shadows:
- soft card shadow: `0 2px 4px rgba(0, 0, 0, 0.05)`
- medium panel shadow: `0 4px 12px rgba(0, 0, 0, 0.08-0.1)`
- modal shadow: `0 8px 30px rgba(0,0,0,0.2)`

Rule:
- Stay in this range. Do not introduce glassmorphism, heavy blur, or deep black shadows unless the page is intentionally redesigned.

## 7. Spacing

Canonical spacing rhythm from current pages:
- small internal spacing: `8px`
- standard gap/padding: `10px`, `12px`, `15px`
- section spacing: `20px`, `25px`, `30px`

Manual tokens already reflect this:
- panel padding: `20px`
- content block padding: `15px`
- content block vertical margin: `20px`
- section margin bottom: `30px`

Rule:
- Prefer these increments instead of inventing arbitrary values like `13px`, `17px`, `23px`.

## 8. Component patterns to reuse

### 8.1 Page wrapper

For standard content pages:
- use `.page-wrapper`
- center content
- keep width near current 900px content shell

### 8.2 Top navigation

Canonical pattern:
- action buttons grouped at top
- “back to editor” is usually success
- cross-page navigation is usually primary

### 8.3 Tabs

Canonical example:
- lessons page tabs in `css/lessons.css`

Tab behavior:
- subtle container background
- inactive tabs are transparent or muted
- active tab uses project primary purple
- keyboard focus must remain visible

If a new tab system is needed, follow the lessons pattern before inventing a new one.

### 8.4 Modals

Canonical modal system:
- `.modal-overlay`
- `.modal-content`
- `.modal-title`
- `.modal-actions`

Rules:
- Reuse the existing modal architecture.
- Use existing spacing and action-row behavior.
- Modal actions should wrap safely on smaller screens.
- All modal variants must remain readable in high-contrast mode.

### 8.5 Code and inline code

Canonical code styling:
- use monospace stack
- light neutral background
- rounded corners
- readable contrast

Use:
- inline `code` for commands and literals
- block examples for runnable snippets

Do not style code like a dark IDE unless the component is the actual editor.

### 8.6 Instructional callouts

Preferred styles come from the manual:
- success/info/error message lists
- concept boxes
- example result boxes
- challenge/summary blocks

Rule:
- If you need “tip”, “warning”, “remember”, “try this”, or “common mistake” UI, first adapt a manual pattern instead of making a new callout style.

### 8.7 Tables

Manual and lessons already establish readable educational tables:
- light backgrounds
- rounded outer surfaces where applicable
- moderate spacing
- not dense, not spreadsheet-like

## 9. Page-specific guidance

### 9.1 Main editor (`index.html`)

This is the most product-like page.
Use it as the reference for:
- primary action hierarchy,
- toolbar behavior,
- modal patterns,
- workspace/control density,
- low-priority SEO/support text placement near secondary navigation rather than in the primary hero/workspace focus path,
- cross-page navigation buttons.

### 9.2 Manual (`manual.html`)

This is the best reference for content-heavy documentation pages.
Use it as the reference for:
- section rhythm,
- content blocks,
- examples and code samples,
- callouts,
- typography hierarchy inside long-form content.

### 9.3 Lessons (`lessons.html`)

Lessons may have local patterns like tabs, task blocks, and image sections.
Those should still stay inside the overall color/type/spacing system defined by the editor + manual.

## 10. Rules for new work

When creating or editing UI:

1. Reuse existing classes before creating new ones.
2. Reuse semantic button colors from `global.css`.
3. Reuse manual tokens/patterns for content pages.
4. Keep page width, spacing, radius, and shadows in the current family.
5. Add responsive behavior for mobile by default.
6. Add high-contrast compatibility for any non-trivial new component.
7. Preserve visible keyboard focus.
8. Avoid inline styles unless content-specific color demonstration requires them.

## 11. What not to do

- Do not introduce a new visual theme for a single page without an explicit design decision.
- Do not replace the font stack casually.
- Do not add new button colors for convenience.
- Do not mix multiple border-radius systems on the same page.
- Do not use low-contrast pastel-on-pastel text.
- Do not remove focus styles.
- Do not build a new modal system.
- Do not create one-off utility classes when an existing component class is sufficient.

## 12. Guidance for AI agents

If you are an AI agent modifying this repository:

- Treat `global.css` as the canonical shared UI layer.
- Treat `manual.css` as the canonical content-page design system.
- Treat `index.html` and `manual.html` as the visual references to imitate.
- Prefer extending existing classes over inventing new systems.
- If you need a new component, make it look like it belongs next to the current manual/editor UI.
- If a requested design conflicts with this guide, follow the user request but keep the change localized and explicit.

## 13. Recommended future cleanup

The project would benefit from gradually formalizing these implicit tokens into a shared `:root` design-token layer, for example:
- shared color tokens
- shared spacing tokens
- shared radius tokens
- shared shadow tokens
- shared content-block tokens

Until that cleanup happens, this file is the human-readable source of truth.
