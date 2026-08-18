# 002 — Add transition to active tab underline indicator

- **Status**: DONE
- **Commit**: f9af719
- **Severity**: MEDIUM
- **Category**: Missed opportunity
- **Estimated scope**: 1 file, small

## Problem

The active tab underline indicator (a 1.5px-tall div at the bottom of each tab) appears and disappears instantly on hover and on page navigation. The indicator uses `bg-(--primary)` when active and `group-hover:bg-gray-200` when inactive — both states snap with no transition, making the hover feel abrupt and the active state feel disconnected.

```html
<!-- src/components/Header.astro:97–104 — current -->
<div
  class:list={[
    'absolute bottom-0 h-[1.5px] w-full left-0',
    tab.isActive
      ? 'bg-(--primary)'
      : 'group-hover:bg-gray-200',
  ]}
/>
```

No `transition` or `opacity` properties are set. The underline pops in/out with no motion.

## Target

Add a background-color transition so the indicator fades in on hover and shows the active state smoothly. Gate behind `@media (hover: hover)` for the same reason as plan 001.

```html
<!-- target -->
<div
  class:list={[
    'absolute bottom-0 h-[1.5px] w-full left-0 tab-indicator',
    tab.isActive
      ? 'bg-(--primary)'
      : 'group-hover:bg-gray-200',
  ]}
/>
```

```css
/* src/styles/global.css — add */
@media (hover: hover) and (pointer: fine) {
  .tab-indicator {
    transition: background-color 150ms ease;
  }
}
```

Duration: 150ms — matches the tab text transition from plan 001 for cohesion. Easing: `ease` — correct for color/appearance changes. Only `background-color` is transitioned — no `transition: all`.

## Repo conventions to follow

- Custom CSS rules live in `src/styles/global.css`, after the `@theme` block.
- If plan 001 has already been executed, a `@media (hover: hover) and (pointer: fine)` block already exists in `global.css`. Add the `.tab-indicator` rule inside that same block — do not create a duplicate media query.
- Tailwind classes handle the actual colors; the CSS only adds the transition timing.

## Steps

1. Open `src/components/Header.astro`. On line 99, add the class `tab-indicator` to the indicator div's class list. Change:
   ```
   'absolute bottom-0 h-[1.5px] w-full left-0',
   ```
   to:
   ```
   'absolute bottom-0 h-[1.5px] w-full left-0 tab-indicator',
   ```

2. Open `src/styles/global.css`. If a `@media (hover: hover) and (pointer: fine)` block already exists (from plan 001), add the following rule inside it:
   ```css
   .tab-indicator {
     transition: background-color 150ms ease;
   }
   ```
   If the media query block does not exist, add the full block after the `@theme` block:
   ```css
   @media (hover: hover) and (pointer: fine) {
     .tab-indicator {
       transition: background-color 150ms ease;
     }
   }
   ```

## Boundaries

- Do NOT change the indicator colors, height, or positioning — transition only.
- Do NOT attempt a sliding/translating indicator between tabs — that requires JS state tracking and is out of scope.
- Do NOT add new dependencies.
- If the class list on line 99 doesn't match the excerpt above (drift since commit f9af719), STOP and report instead of improvising.

## Steps depend on

- Plan 001 (optional — if executed first, reuse its media query block; if not, create a new one).

## Verification

- **Mechanical**: Run `npx astro dev` — no build errors. Visit any page with tabs.
- **Feel check**: Hover over the navigation tabs and confirm:
  - The gray-200 underline fades in smoothly on hover, not snapping.
  - The underline fades out smoothly when the cursor leaves.
  - The active tab's blue (`--primary`) underline is present on page load with no transition artifact.
  - In DevTools, Animations panel at 10% speed: confirm the transition is ~150ms on `background-color`.
  - On a touch device (or Chrome DevTools device mode), confirm no hover transition fires on tap.
  - Navigate between tabs: the blue indicator appears on the new tab without an awkward stale state on the old tab (each page load is a fresh render, so the indicator simply appears — no cross-tab sliding expected).
- **Done when**: Tab indicator hover is smooth on desktop, instant on touch, and the active indicator renders correctly without transition artifacts on page load.
