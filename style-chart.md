Base Diagram Style Guide
========================
Feed this file to Claude when generating diagrams for Base documentation.
It defines the visual language derived from the Base web design system (BDS).


1. COLOR PALETTE
----------------

Use the BDS gray scale as the primary palette for diagrams.
Reserve brand blue for emphasis, CTAs, or highlighted paths.

Gray Scale (light mode):
  gray-0   #FFFFFF   ── canvas / diagram background
  gray-5   #F8F8F8   ── subtle card background, alternating rows
  gray-10  #EFEFEF   ── card borders, divider lines
  gray-15  #DADADA   ── secondary borders
  gray-20  #C4C4C4   ── disabled / de-emphasized strokes
  gray-30  #B8B8B8   ── placeholder text
  gray-40  #9A9A9A   ── muted labels, annotations
  gray-50  #6F6F6F   ── secondary text
  gray-60  #5E5E5E   ── body text (on white)
  gray-80  #3A3A3A   ── strong labels
  gray-90  #262626   ── headings, primary text
  gray-100 #111111   ── highest contrast text, dark fills

Dark-on-light rule: text on white backgrounds should be gray-90 (#262626) or black (#000000).
Light-on-dark rule: text on dark backgrounds should be white (#FFFFFF) or gray-5 (#F8F8F8).

Brand Blue:
  base-blue        #0000FF   ── primary brand accent, interactive highlights
  blue-60          #0052FF   ── links, selected states
  blue-40          #266EFF   ── lighter accent
  blue-5           #D3E1FF   ── blue tint backgrounds

Semantic Colors (use sparingly, only when meaning is needed):
  green-50         #129961   ── success, positive
  red-60           #CF202F   ── error, destructive
  yellow-50        #CF9700   ── warning, caution
  orange-50        #E1591B   ── attention


2. TYPOGRAPHY
-------------

Font families (in order of preference):
  Primary:    "Base Sans" (--font-base-sans) or fallback to system sans-serif
  Body text:  "Base Sans Text" (--font-base-sans-text) — optimized for reading
  Monospace:  "Base Sans Mono" or fallback to system monospace
  Display:    "Base Sans" at 400 weight with tight tracking

For diagrams, use a clean sans-serif (Inter, Helvetica, or system default if
custom fonts are unavailable). Avoid decorative fonts.

Text sizes (use these as reference — scale proportionally for diagram context):
  Display    36–56px   ── diagram title (rarely needed)
  Title 1    24–28px   ── section headings within a diagram
  Title 2    20–24px   ── subsection or group headings
  Title 3    18–20px   ── card titles, node names
  Headline   16–18px   ── emphasized labels
  Body       15–16px   ── descriptions, annotations
  Label      13–14px   ── small labels, tag text
  Caption    11–12px   ── footnotes, fine print (uppercase, 500 weight)

General rules:
  - Font weight: 400 (regular) for almost everything. Use 500 for captions.
  - Letter spacing: tight (-0.01em to -0.04em) for headings, 0 for body.
  - Do not use bold (700) for headings — the site uses regular weight throughout.


3. SHAPES & BORDER RADIUS
--------------------------

  Cards / containers:  10px border-radius  (the standard "card" radius)
  Buttons / pills:     9999px (fully rounded / pill shape)
  Small chips / tags:  6–8px
  Code blocks:         8–12px
  Icons / avatars:     50% (circle)

Default to 10px radius for any rectangular container in diagrams.
Use fully rounded (pill) only for action buttons or status badges.
Avoid sharp 0px corners — the design language is always softly rounded.


4. BORDERS & STROKES
---------------------

  Primary border:       1px solid gray-10 (#EFEFEF)
  Subtle border:        1px solid rgba(0, 0, 0, 0.06–0.10)
  On dark backgrounds:  1px solid rgba(255, 255, 255, 0.10–0.20)
  Emphasis border:      1px solid gray-15 (#DADADA)

For connector lines / arrows in diagrams:
  Default stroke:       1.5–2px, gray-20 (#C4C4C4) or gray-40 (#9A9A9A)
  Highlighted path:     2px, base-blue (#0000FF)
  Arrow style:          simple pointed, not ornate


5. BACKGROUNDS & FILLS
-----------------------

  Page background:     #FFFFFF (light) / #111111 (dark)
  Card background:     #FFFFFF with 1px gray-10 border
  Subtle card fill:    gray-5 (#F8F8F8) — no border needed
  Grouped section:     gray-5 (#F8F8F8) or rgba(0, 0, 0, 0.03)
  Highlighted fill:    blue-5 (#D3E1FF) for blue-tinted callouts
  Dark card:           gray-100 (#111111) with rgba(255, 255, 255, 0.08) border


6. SHADOWS
----------

Use shadows sparingly. The site favors flat design with borders over heavy shadows.

  Subtle elevation:    0 4px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.08)
  Medium elevation:    0 8px 48px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08)

Most diagram elements should have no shadow — use borders for separation.


7. SPACING
----------

Use a 4px base grid. Common spacing values:

  4px (gap-1)     ── tight, between inline elements
  8px (gap-2)     ── compact groups
  12px (gap-3)    ── related items within a card
  16px (gap-4)    ── standard internal card padding, between card sections
  24px (gap-6)    ── between cards or groups
  32px (gap-8)    ── between diagram sections
  48px (gap-12)   ── major section breaks

Card internal padding: 16–24px.
Content max-width: 1200px (for full-width diagrams).


8. LAYOUT GUIDELINES
---------------------

  - Left-to-right flow for processes, top-to-bottom for hierarchies.
  - Align elements to the 4px grid.
  - Group related nodes visually using subtle gray-5 background regions.
  - Use generous whitespace — the site aesthetic is clean and airy.
  - Maximum content width in diagrams should match the site: ~1200px.


9. ICONOGRAPHY
--------------

  - Line-style icons, not filled.
  - Stroke width: 1.5–2px.
  - Icon size: 16–24px for inline, 32–40px for feature callouts.
  - Icon color: match surrounding text color (gray-90 on light, white on dark).


10. DO / DON'T
--------------

  DO:
  - Use the gray scale as the foundation; add blue only for emphasis.
  - Keep rounded corners consistent at 10px for containers.
  - Use regular (400) weight text — the brand avoids heavy bold type.
  - Keep diagrams clean with ample whitespace.

  DON'T:
  - Use bright multi-color palettes — the site is intentionally restrained.
  - Use drop shadows as a primary visual separator.
  - Mix rounded and sharp corners in the same diagram.
  - Use stroke widths thinner than 1px.
  - Use all-caps except for caption/footnote-style labels.
  - Use gradients unless replicating a specific site pattern.