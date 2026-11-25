---
name: QrOne
description: A felt letterboard says what is happening; below it, a quiet off-white working ground.
colors:
  felt: "#1d1d1b"
  groove: "rgba(255, 255, 255, 0.055)"
  oak: "#b98a5a"
  oak-edge: "#9a6f44"
  letter: "#f4f1ea"
  letter-dim: "#c9c4b8"
  board-seam: "#3a3936"
  yellow: "#f2c230"
  yellow-press: "#ddb01f"
  red-letter: "#ff6b57"
  orange-letter: "#ff9a5c"
  green-letter: "#8fd19e"
  ground: "#f7f6f2"
  field: "#ffffff"
  ink: "#1d1d1b"
  muted: "#5e5b54"
  seam: "#dcd8cf"
  field-edge: "#8f8a7f"
  tint: "#efede7"
  ok: "#2f6f48"
  bad: "#a8261c"
  warn: "#8a4f00"
  qr-black: "#000000"
typography:
  board:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "2.75rem"
    fontWeight: 800
    lineHeight: "42px"
    letterSpacing: "0.12em"
  brand:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.14em"
  stamp:
    fontFamily: "Big Shoulders Display, Arial Narrow, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.1em"
  read:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  big:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
  body:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1
  small:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
  mono:
    fontFamily: "ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  none: "0px"
spacing:
  groove: "14px"
  gutter: "16px"
  gutter-tablet: "40px"
  gutter-wide: "64px"
  tap: "48px"
  column-gap: "48px"
components:
  board:
    backgroundColor: "{colors.felt}"
    textColor: "{colors.letter}"
    typography: "{typography.board}"
    rounded: "{rounded.none}"
  tab:
    backgroundColor: "{colors.felt}"
    textColor: "{colors.letter-dim}"
    typography: "{typography.label}"
    height: "52px"
  tab-selected:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 20px"
  button-primary-hover:
    backgroundColor: "{colors.yellow-press}"
  button-secondary:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "{colors.tint}"
  segment:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    height: "44px"
    padding: "0 16px"
  segment-selected:
    backgroundColor: "{colors.felt}"
    textColor: "{colors.letter}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.none}"
    height: "48px"
    padding: "10px 12px"
  input-big:
    typography: "{typography.big}"
    height: "60px"
  drop-zone:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    padding: "22px 20px"
  decoded:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    padding: "12px 14px"
---

# Design System: QrOne

## Overview

**Creative North Star: "The Shop-Window Letterboard"**

Every page opens with a black felt letterboard in an oak frame. A few big, widely spaced capital letters on it say what is happening right now ("MAKE A CODE THAT NEVER EXPIRES", "THIS CODE CAN BE SWITCHED OFF"). The board is the page's status display, not a hero banner: when the job or the verdict changes, the board re-sets its words. Everything under the board is a quiet off-white working ground where the actual tool lives.

The system is flat and square. Areas are separated by 1px hairline seams, never by shadows, floating cards or rounded boxes. Colour is rationed: yellow means "the one thing to press", coloured letters on the board mean "this is the verdict", and everything else is ink on off-white. Density is low and text is short; the visitor is a non-technical shop owner who wants a working code in about ten seconds.

When you add a page (a dashboard, pricing, sign-in), start from the same skeleton: oak frame, board with the brand row and one short board sentence, then the working ground with seams. If the new page has nothing to say on the board, say what the page is ("Your codes", "Pricing", "Sign in"), in a few words.

**Key Characteristics:**
- An oak-framed felt letterboard at the top of every page, carrying the brand, the nav and one short sentence.
- Big Shoulders Display capitals on the board; Figtree for everything you read or type.
- Square corners everywhere (0px radius).
- 1px seams divide areas; no shadows, no cards.
- One yellow primary action per screen.
- Red, orange and green letters only for checker verdicts on the board.

## Colors

A near-black felt and an off-white ground do almost all the work; yellow and the three verdict letters are rare and each has exactly one job.

### Primary
- **Letter Yellow** (`yellow`, #f2c230): the background of the one primary action on a screen (Download PNG on Make, Choose a photo on Check), the skip link and text selection. Nothing else.
- **Pressed Yellow** (`yellow-press`, #ddb01f): hover state of the yellow button. Never used on its own.

### Board (the letterboard world)
- **Felt** (`felt`, #1d1d1b): the board surface, the selected segment in the segmented control, and the browser theme colour.
- **Felt Groove** (`groove`, rgba(255,255,255,0.055)): the faint 1px horizontal groove line drawn every 14px across the felt.
- **Oak** (`oak`, #b98a5a): the frame around the board (8px on phones, 12px from 720px).
- **Oak Edge** (`oak-edge`, #9a6f44): the 1px line under the frame where it meets the working ground.
- **Letter White** (`letter`, #f4f1ea): board letters, the brand, hovered nav links and tabs.
- **Dim Letter** (`letter-dim`, #c9c4b8): nav links and unselected tabs at rest.
- **Board Seam** (`board-seam`, #3a3936): the 1px seams between and above the tabs on the felt (`--board-seam`).

### Verdict letters (board only)
- **Red Letter** (`red-letter`, #ff6b57): board text when the checked code goes through a known QR vendor and can be switched off.
- **Orange Letter** (`orange-letter`, #ff9a5c): board text when the code goes through an unknown short link.
- **Green Letter** (`green-letter`, #8fd19e): board text when no vendor sits in the middle, or the code is not a link.

### Neutral (the working ground)
- **Ground** (`ground`, #f7f6f2): the page background below the board, and the selected tab (the tab is a piece of the ground reaching up into the board).
- **Field** (`field`, #ffffff): the inside of inputs, segments, the drop zone, the decoded-text box and the QR preview's frame.
- **Ink** (`ink`, #1d1d1b): all body text, button borders, the focus outline, the big address field's border. Same value as felt on purpose.
- **Muted** (`muted`, #5e5b54): hints, status lines, the footer, the empty-preview message.
- **Seam** (`seam`, #dcd8cf): every 1px dividing line on the ground: column splits, expander tops, segment borders, the footer rule, the QR preview frame.
- **Field Edge** (`field-edge`, #8f8a7f): the resting border of ordinary inputs, selects and colour pickers; turns ink on hover (`--field-edge`).
- **Tint** (`tint`, #efede7): hover background for secondary buttons, segments and the drop zone.

### Messages (on the ground)
- **OK Green** (`ok`, #2f6f48): reserved for success text on the ground. Defined in the build but not currently used.
- **Error Red** (`bad`, #a8261c): form error messages and the decoded-text border when the verdict is "can be switched off".
- **Warning Brown** (`warn`, #8a4f00): warnings (low colour contrast in the QR options) and the decoded-text border for an unknown link.

### QR output
- **QR Black** (`qr-black`, #000000): the default dark colour of the generated QR code. The visitor can change it in the options.

### Named Rules
**The One Yellow Rule.** Each screen has at most one yellow button, and it is the action the visitor came to do. Secondary actions are ink-outlined. If you are about to add a second yellow thing, one of them is not primary.

**The Verdict Letter Rule.** Red, orange and green letters appear only on the board, and only to state a checker verdict. They are never used for buttons, badges, charts, links or decoration. Ground-side messages use the darker `bad`, `warn` and `ok` instead, which pass contrast on off-white.

**The Only Pure Black Rule.** Pure #000000 belongs to the QR code itself. Interface "black" is felt/ink #1d1d1b.

## Typography

**Display Font:** Big Shoulders Display, weight 800 only (fallback Arial Narrow, sans-serif)
**Body Font:** Figtree Variable (fallback system-ui, sans-serif)
**Mono:** ui-monospace, Cascadia Mono, Consolas (only for decoded QR content)

Both fonts are self-hosted through @fontsource and imported in `src/main.js`, so no visitor contacts a font company. Do not add a Google Fonts link.

**Character:** Tall, condensed, widely tracked capitals read like plastic letters pressed into felt; Figtree is a calm, round workhorse that stays out of the way.

### Hierarchy
Display roles are always uppercase. Sizes listed as phone / from 720px / from 1200px.

- **Board** (800, 2.75rem / 4.75rem / 5.25rem; line-height 42px / 84px / 84px; tracking 0.12em; uppercase): the one board sentence per page, the `<h1>`. Keep it to about 2 lines; max width 14em, balanced wrapping.
- **Brand** (800, 1.5rem all sizes, line-height 1, tracking 0.14em, uppercase): the wordmark in the board's nav row.
- **Stamp** (800, 1.75rem / 2rem / 2rem, line-height 1, tracking 0.1em, uppercase): short statements on the ground, such as "Never expires" beside the code and "Drop a QR image". Reading-page `<h2>` uses the same size with tracking 0.08em and line-height 1.05.
- **Read** (400, 1.0625rem, line-height 1.55): paragraphs and list items on reading pages (About, Privacy, FAQ), max 65ch; FAQ questions at 700.
- **Big** (400, 1.25rem): only the large address field (60px tall).
- **Body** (400, 1rem, line-height 1.55): default text in the tools.
- **Label** (700, 0.9375rem): form labels, legends, buttons, tabs, expander titles.
- **Small** (400, 0.875rem): hints, status, errors (600), nav links (600), footer.
- **Mono** (400, 0.9375rem, line-height 1.45): the "The code says" box only.

### Named Rules
**The Felt Groove Rule.** The felt has a 1px groove every 14px. Any line-height for text set on the board must be a multiple of 14px (the build uses 42px = 3 grooves on phones and 84px = 6 grooves from 720px) so letter rows sit in the grooves. If you introduce a new board size, pick its line-height from 28, 42, 56, 70, 84, 98...

**The One Size Per Role Rule.** Each text role has one size per breakpoint, set by a variable in `:root` (`--t-board`, `--t-stamp`, `--t-read`, `--t-big`, `--t-body`, `--t-label`, `--t-small`). Use the variable; don't invent an in-between size.

**The Display-Is-Caps Rule.** Big Shoulders Display is only ever 800, uppercase and tracked. Never use it for body text, lowercase, or long sentences.

## Layout

Mobile first: base styles target a 360px phone; wider screens are layered on at two breakpoints.

- **Breakpoints:** 720px (two columns, bigger board) and 1200px (biggest board, max content width).
- **Gutter** (`--gutter`): 16px on phones, 40px from 720px, 64px from 1200px. The board, main and footer all use it, so left edges line up.
- **Max width:** from 1200px, main and footer cap at 1312px. Reading pages cap at 44rem with text at 65ch.
- **Tap targets:** 48px minimum (`--tap`) for buttons, inputs, expander rows and nav; tabs 52px / 56px; segments 44px.
- **Tool layout:** on phones, one column in source order (type switch, field, code and download, options), separated by seams. From 720px, two equal columns split by a vertical seam, with 48px of space on each side of it; the code sits in the right column. Keyboard order never changes with layout.
- **Column padding:** 24px top and bottom on phones; 40px top, 48px bottom from 720px.
- **Form rhythm:** labels sit 18px below the previous field and 6px above their own.
- **Reading pages:** board with only the brand row and one sentence (no tabs), then a single text column.

## Elevation & Depth

There is no elevation. The system is completely flat: no drop shadows, no floating cards, no blur, no layered panels. Depth comes from only two things: the board sitting inside its oak frame, and the selected tab being the ground colour, so the working area appears to reach up into the board.

### Named Rules
**The Hairline Seam Rule.** Areas are divided by a single 1px line in `seam` (#dcd8cf) on the ground, or `board-seam` (#3a3936) on the felt. Never use `box-shadow` for depth, never put content in a raised card, never use a background block to separate sections. If two areas need separating, draw a seam between them.

## Shapes

Everything is square: 0px radius on buttons, inputs, selects, segments, the drop zone, the QR preview frame and the board. Borders are always 1px. The only drawn icon is the plus/minus on expanders, built from two 14px by 2px bars in ink. The empty QR preview is a square with three seam-coloured corner blocks, hinting at finder patterns.

## Components

### Letterboard (signature)
The header of every page: an oak frame (8px padding, 12px from 720px; no padding at the bottom) around the felt board.
- **Felt:** `felt` with a repeating 14px groove; 14px top padding (10px from 720px); side padding = gutter.
- **Nav row:** brand on the left; links in `letter-dim`, 600, small size, 14px by 10px padding, turning `letter` on hover. The last link's text aligns with the board edge.
- **Board text:** the page's `<h1>`, `aria-live="polite"` on the home page. Set its words only through `setBoard(text, tone)` in `src/board.js`, which splits the sentence into per-letter spans (hidden from screen readers) and adds one plain copy for screen readers. Tone is `""`, `"ok"`, `"warn"` or `"bad"`.
- **Focus on the board:** the focus outline turns yellow so it shows on felt.

### Tabs (Make | Check)
ARIA tabs sitting on the board's bottom edge.
- **Rest:** transparent on felt, `letter-dim`, label type, 1px `board-seam` on top and between.
- **Selected:** `ground` background, `ink` text, so the tab merges into the working area.
- **Phones:** full width, two equal halves, 52px tall. **From 720px:** sized to text (30px side padding), 56px tall, seams on both sides.
- **Keyboard:** only the selected tab is in the tab order; Left/Right arrows move and select. Selecting Check sets `#check` in the URL.

### Segmented control
A row of radio buttons that looks like joined square keys (used for "The code holds: Link | Text | Wi-Fi | Email").
- **Rest:** `field` background, 1px `seam` border, segments overlap by 1px so borders don't double; 44px tall, 16px side padding, 600 weight.
- **Hover:** `tint`. **Selected:** `felt` background with `letter` text (a piece of the board).
- **Focus:** 3px ink outline, 2px offset. The real radio input covers the segment invisibly, so it stays accessible.

### Buttons
Square, 1px border, 48px tall, 20px side padding, label type, no-wrap.
- **Primary:** `yellow` fill and border, `ink` text; hover `yellow-press`. One per screen (see The One Yellow Rule).
- **Secondary:** transparent with a 1px `ink` border; hover `tint`.
- **Quiet:** like secondary with a `seam` border, for small undo actions such as "Remove logo".
- **Pressed:** moves down 1px.
- **Focus:** 3px `ink` outline, 2px offset (yellow on the board).

### Inputs / Fields
- **Style:** `field` background, 1px `field-edge` border, 0 radius, 48px tall, 10px by 12px padding, inherited font.
- **Hover:** border turns `ink`. **Focus:** 3px `ink` outline with no offset, border `ink`.
- **Big field:** the main address field is 60px tall, big type, and has an `ink` border at rest, because it is the first thing to fill in.
- **Placeholder:** `--placeholder`, #6f6b63 (5.3:1 on white).
- **Checkboxes and radios:** native, `accent-color: ink`; checkbox rows are 48px tall.
- **Errors:** a line of `bad` text (600, small) under the field; warnings in `warn`. Empty message elements are hidden.
- **Field + button pairs:** the input stretches, the button sits to its right at the same height, 8px apart.

### Expanders (details)
Used for "Colour, size and logo" in the tool and for questions on the FAQ.
- A 1px `seam` line on top (FAQ items also close the list with a bottom seam).
- Summary row at least 48px tall (56px on FAQ), title on the left in label weight (read size on FAQ), a drawn plus on the right that becomes a minus when open. No native marker.
- Options stay collapsed by default; the tool must work without opening them.

### Drop zone
The main input on Check: the whole block is a `<label>` for a hidden file input.
- `field` background, 1px `ink` border, 22px by 20px padding, contents stacked on the left.
- Holds a stamp-type title ("Drop a QR image"), the yellow primary button look ("Choose a photo"), and a hint.
- **Hover / dragging over:** `tint`. **Focus:** 3px ink outline on the whole zone.

### Verdict panel
Shown in Check's right column after a code is read. The verdict sentence itself goes on the board (in a verdict letter colour), so the panel does not repeat it.
- "The code says" label, then the decoded content in a mono box (`field`, 1px `seam` border, wraps anywhere). The border turns `bad` for a vendor link and `warn` for an unknown link.
- Explanation paragraphs up to 60ch; follow-up sections ("What you can do") start with a seam and a label-size heading.
- Links found in the code are shown as text first and are never opened automatically.

### QR preview
- The generated code sits on white inside a 1px `seam` frame, up to 240px wide on phones and 300px from 720px.
- Before anything is typed, a 96px placeholder square with three corner blocks and a muted one-line hint holds the space.
- Next to it: a stamp ("Never expires"), a one-line explanation, the yellow PNG button plus a secondary SVG button, and a hint.

### Footer
- A 1px `seam` rule on top, 24px above it, then a row: a one-line note on the left, links on the right; wraps on phones.
- `muted`, small type; links are underlined (1px, 3px offset) and turn `ink` on hover. Same gutter and max width as main.

### Links
Ink, underlined at 1px with a 3px offset; the underline thickens to 2px on hover. Board nav links are the exception (no underline, dim letters).

### Motion
There is exactly one designed animation: the **push-in**. When the board's words change, each letter drops 0.32em into place and fades from 20% to full, over 380ms with `cubic-bezier(0.16, 1, 0.3, 1)`, staggered 16ms per letter. Under `prefers-reduced-motion: reduce` the animation is removed and letters appear instantly. On first load the board text is set without animation. Do not add other entrance, scroll or hover animations; buttons only shift 1px when pressed.

## Do's and Don'ts

### Do:
- **Do** start every new page with the oak frame, felt board, brand row and one short board sentence set in Big Shoulders Display caps.
- **Do** use the CSS variables in `:root` of `src/style.css` for every colour and text size; add a new variable rather than a raw hex.
- **Do** keep board line-heights at multiples of 14px (42px, 84px).
- **Do** divide areas with a 1px `seam` line (#dcd8cf) and white space.
- **Do** give each screen exactly one yellow (#f2c230) primary button; make every other button ink-outlined.
- **Do** keep corners square (0px) and targets at least 48px tall.
- **Do** change the board through `setBoard()` so the push-in and the screen-reader copy stay correct.
- **Do** keep the 3px ink focus outline (yellow on the board).

### Don't:
- **Don't** use `box-shadow` for depth, floating cards, rounded boxes or grey panels.
- **Don't** use red, orange or green letters anywhere except a checker verdict on the board.
- **Don't** use yellow for highlights, badges, links, icons or a second button.
- **Don't** use pure black (#000000) in the interface; it belongs to the QR code.
- **Don't** put Big Shoulders Display in lowercase, in a lighter weight, or in paragraphs.
- **Don't** add a centred hero, blue tabs, gradient buttons or stock illustrations.
- **Don't** add animations beyond the push-in, and never one that ignores reduced motion.
- **Don't** load fonts or scripts from a third-party server.
