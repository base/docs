# 001 — Add color transition to navigation tab hover

- **Status**: DONE
- **Commit**: f9af719
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: 1 file, small

## Problem

The top-level navigation tabs in the header change text color on hover (`text-gray-500` → `hover:text-gray-800`) with no CSS transition. The color snaps instantly, which feels abrupt on an element users interact with tens of times per day.

```html
<!-- src/components/Header.astro:89–95 — current -->
<a
  href={tab.href}
  class:list={[
    'group relative h-full gap-2 flex items-center font-normal text-gray-500 hover:text-gray-800',
    tab.isActive && 'text-gray-900',
  ]}
>
```

No `transition` property is set — the color change is instantaneous.

## Target

Add a fast color transition gated behind `@media (hover: hover)` so the change feels smooth without adding latency to touch interactions:

```html
<!-- target -->
<a
  href={tab.href}
  class:list={[
    'group relative h-full gap-2 flex items-center font-normal text-gray-500 hover:text-gray-800 tab-link',
    tab.isActive && 'text-gray-900',
  ]}
>
```

```css
/* src/styles/global.css — add */
@media (hover: hover) and (pointer: fine) {
  .tab-link {
    transition: color 150ms ease;
  }
}
```

Duration: 150ms — fast enough for a hover effect at this frequency. Easing: `ease` — correct for hover/color changes per AUDIT.md. No `transition: all` — only `color` is animated.

## Repo conventions to follow

- This codebase uses Tailwind utility classes for most styling, with custom CSS in `src/styles/global.css` for things that can't be expressed as utilities.
- The `global.css` file already contains custom `:root` variables and a `@theme` block with keyframes (`dot-bounce`). Add new rules after the `@theme` block.
- Hover color changes elsewhere in the header (GitHub, Support links) use the same pattern (`text-gray-400 hover:text-gray-600`) with no transition — this plan scopes to tabs only.

## Steps

1. Open `src/components/Header.astro`. On line 92, add the class `tab-link` to the tab anchor's class list. Change:
   ```
   'group relative h-full gap-2 flex items-center font-normal text-gray-500 hover:text-gray-800',
   ```
   to:
   ```
   'group relative h-full gap-2 flex items-center font-normal text-gray-500 hover:text-gray-800 tab-link',
   ```

2. Open `src/styles/global.css`. After the closing `}` of the `@theme` block (after line 28), add:
   ```css
   @media (hover: hover) and (pointer: fine) {
     .tab-link {
       transition: color 150ms ease;
     }
   }
   ```

## Boundaries

- Do NOT add transitions to the GitHub, Support, or Dashboard links — that is a separate finding (#3).
- Do NOT change the tab colors, font weight, or any other visual property — transition only.
- Do NOT add new dependencies.
- If the class list on line 92 doesn't match the excerpt above (drift since commit f9af719), STOP and report instead of improvising.

## Verification

- **Mechanical**: Run `npx astro dev` — no build errors. Visit any page with tabs (e.g. `/get-started/connect-to-base`).
- **Feel check**: Hover over the navigation tabs and confirm:
  - The text color fades smoothly from gray-500 to gray-800, not snapping.
  - The transition feels fast and responsive — not sluggish, not laggy.
  - In DevTools, Animations panel at 10% speed: confirm the transition is ~150ms and uses `ease`.
  - On a touch device (or Chrome DevTools device mode), confirm no hover transition fires on tap — the `(hover: hover)` media query gates it.
  - The active tab (`text-gray-900`) shows no transition artifact when the page loads.
- **Done when**: Tab hover color change is smooth on desktop, instant on touch, and no other header elements are affected.
