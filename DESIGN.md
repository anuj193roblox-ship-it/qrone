---
name: QrOne
description: One quiet dark room with a single blue light on the action that matters.
colors:
  bg: "#0b0c0f"
  surface: "#14161b"
  surface-2: "#1b1e25"
  line: "#262a33"
  line-strong: "#353a46"
  line-hover: "#4a5160"
  text: "#f4f5f7"
  muted: "#a6acb8"
  faint: "#868d9c"
  accent: "#3563f0"
  accent-hover: "#2f58e0"
  accent-text: "#6b95ff"
  on-accent: "#ffffff"
  qr-white: "#ffffff"
  ok: "#4ade80"
  warn: "#fbbf24"
  bad: "#f87171"
  ok-bg: "rgba(74, 222, 128, 0.12)"
  warn-bg: "rgba(251, 191, 36, 0.12)"
  bad-bg: "rgba(248, 113, 113, 0.12)"
typography:
  display:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 800
    lineHeight: 1.06
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 800
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
  brand:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  body-large:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Figtree Variable, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
  button:
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
    lineHeight: 1.45
rounded:
  card: "20px"
  drop: "16px"
  field: "12px"
  pill: "999px"
spacing:
  gutter: "20px"
  gutter-wide: "32px"
  card-pad: "20px"
  card-pad-wide: "28px"
  tap: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "{spacing.tap}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "{spacing.tap}"
  button-ghost-hover:
    backgroundColor: "{colors.surface-2}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "{spacing.tap}"
  button-quiet-hover:
    textColor: "{colors.text}"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-pad}"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "11px 14px"
    height: "{spacing.tap}"
  input-big:
    typography: "{typography.body-large}"
    height: "56px"
  type-chip:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "44px"
  type-chip-selected:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
  tab-track:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    padding: "4px"
  tab-selected:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    height: "44px"
  pill-ok:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  pill-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  pill-bad:
    backgroundColor: "{colors.bad-bg}"
    textColor: "{colors.bad}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  pill-neutral:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  qr-preview:
    backgroundColor: "{colors.qr-white}"
    rounded: "{rounded.field}"
    padding: "6px"
    width: "220px"
---

# Design System: QrOne

All values below come from `src/style.css` (the `:root` block and the component rules). If this file and the CSS ever disagree, the CSS is right and this file needs updating. Use the CSS custom properties (`var(--accent)`, `var(--r-card)` and so on) in new code; never paste the hex values.

## Overview

**Creative North Star: "The Quiet Room with One Blue Light"**

QrOne is a calm, dark, single-column-on-phone interface for small business owners who are about to print a QR code, or who just found one that stopped working. The page should feel safe before it is read: a near-black ground, panels one step lighter with soft corners and hairline borders, off-white and grey text, and exactly one blue thing asking to be pressed. Nothing blinks, nothing counts down, nothing competes.

Density is low and targets are large (48px tall controls, 44px minimum). The tool comes first and the explanation sits beside or below it, never in front of it. The signature device is the print preview: the code always sits on white "paper" over a quiet dot grid, so people see real print contrast before they download. The promise is shown as three steps ("What happens after you print") rather than claimed in a slogan.

The design is dark only (`color-scheme: dark`). There is no light theme to support.

**Key Characteristics:**
- Near-black ground, flat panels a step lighter, 1px lines for every division.
- One accent hue (blue). Status colours exist only inside pills and verdicts.
- One font, Figtree, at a handful of fixed sizes; weight does the hierarchy work.
- Pills for every button, tab, chip and status; 20px cards; 12px fields.
- A big two-line headline whose second line is blue.
- One authored motion: a result "arrives".

## Colors

A cool near-black ladder for surfaces and lines, a three-step grey ladder for text, one blue, and three status colours that are kept on a short leash.

### Primary
- **Signal Blue** (`accent`, #3563f0): the background of the one primary button on a screen, with white text (5:1). Also the skip-link background, text selection, and checkbox/radio tint.
- **Signal Blue, Pressed** (`accent-hover`, #2f58e0): the primary button's hover. It is darker, not lighter, so white text stays readable.
- **Lamp Blue** (`accent-text`, #6b95ff): blue used as text or a thin line on the dark ground (6.9:1). The second line of every headline, all links, the dashboard short-link, the focus ring, the text caret, the border of the selected type chip, the drop zone's hover border, and the icon of the "Today" timeline step.

### Neutral
- **Night Ground** (`bg`, #0b0c0f): the page background. Also used for "wells" sunk into a card: the tab track and the drop zone.
- **Panel** (`surface`, #14161b): every card.
- **Raised Panel** (`surface-2`, #1b1e25): inputs, the selected tab, the selected chip, timeline icon circles, the decoded-content block, the neutral pill, and ghost-button hover.
- **Hairline** (`line`, #262a33): card borders and every 1px rule inside a card, the top-bar and footer rules, the timeline connector.
- **Hairline, Strong** (`line-strong`, #353a46): borders of things you can press or type in (inputs, ghost buttons, chips, the drop zone's dashed edge).
- **Hairline, Hover** (`line-hover`, #4a5160): the border those controls take on hover. It is a repeated literal in the CSS, not yet a `:root` variable; add `--line-hover` if you touch it.
- **Off-White** (`text`, #f4f5f7): headings, labels, body text you must read.
- **Grey** (`muted`, #a6acb8): supporting text, hints, nav links, unselected tabs and chips, reading-page paragraphs.
- **Faint Grey** (`faint`, #868d9c): input placeholders (4.6:1 on Raised Panel) and the footer sentence. Never for anything the user must read to act.
- **White** (`on-accent` and `qr-white`, #ffffff): text on the blue button, and the background behind every QR code.

### Status (code states and checker verdicts only)
- **Green** (`ok`, #4ade80 on `ok-bg`): "Looks static", "Not a web link", "Never expires".
- **Amber** (`warn`, #fbbf24 on `warn-bg`): "Unknown short link", "Expires in 3 days" or fewer. Also the colour-contrast warning text in the Make tool.
- **Red** (`bad`, #f87171 on `bad-bg`): "Vendor-controlled", "Expired", "Switched off". Also form error text.

The `*-bg` tints are the same hue at 12% opacity and exist only as pill backgrounds.

### Named Rules
**The One Blue Button Rule.** Each screen has at most one solid blue (`btn-primary`) button: Download PNG on Make, Choose a photo on Check, Create code on the dashboard, Email me a link on sign-in. Every other action is a ghost or quiet button. On a pricing page, the plan buttons are ghost buttons too (the dashboard's Starter / Plus / Pro buttons already are).

**The Thin Blue Rule.** Outside that one button, blue only appears as text or a hairline: the headline's second line, links, focus rings and selection markers. Never as a filled panel, badge or background.

**The Status Leash Rule.** Green, amber and red appear only inside a `.pill` (code states, checker verdicts) and in one-line form messages (`msg-error`, `msg-warn`). Never as a button, a heading colour, an icon colour or a decoration.

**The White Paper Rule.** A QR code is always drawn on pure white (#ffffff) with a 6px white margin and 12px corners, whatever the page colour, because scanners and printers need it.

## Typography

**Font:** Figtree Variable (self-hosted through the `@fontsource-variable/figtree` package, imported in `src/main.js`), falling back to `system-ui, sans-serif`. No other text font, and no font from a CDN.
**Mono:** `ui-monospace, "Cascadia Mono", Consolas, monospace`, only for decoded QR content and short links.

**Character:** One friendly geometric sans. Hierarchy comes from weight (800 headings, 600 to 700 labels and buttons, 400 text) and a few fixed sizes, not from a second typeface.

### Hierarchy
Each role has one size, set as a variable. Only the display size changes with the screen.

| Role | Variable | Phone (<720px) | 720px+ | 1024px+ | Weight / line-height / tracking | Used for |
|---|---|---|---|---|---|---|
| Display | `--t-hero` | 2.5rem | 3.5rem | 4rem | 800 / 1.06 / -0.025em, `text-wrap: balance` | The page headline (`.hero-title`), one per page |
| Headline | `--t-h2` | 1.375rem | same | same | 800 / -0.015em | Section titles, card titles (`.stamp`), verdict titles, the timeline title |
| Title / large body | `--t-big` | 1.125rem | same | same | 700 for titles, 400 for text | Headline subline, drop-zone title, FAQ questions, reading-page paragraphs, big URL input |
| Brand | (literal) | 1.25rem | same | same | 800 / -0.01em | The "QrOne" wordmark in the top bar |
| Body | `--t-body` | 1rem | same | same | 400 / 1.6 | Default text, inputs |
| Label | `--t-label` | 0.9375rem | same | same | 600 (labels), 700 (buttons, tabs) | Form labels, legends, buttons |
| Small | `--t-small` | 0.875rem | same | same | 400; 600 for nav; 700 for pills | Hints, status lines, nav links, pills, footer |
| Mono | `--mono` | 0.9375rem | same | same | 400 / 1.45 | Decoded content, short links |

Reading text is capped at `65ch` on reading pages and `60ch` in verdicts. The subline is capped at `34ch`.

### Named Rules
**The Two-Line Headline Rule.** Every page opens with one `h1#headline.hero-title`. Line one is off-white; an optional line two, wrapped in `<span class="line accent">`, is Lamp Blue and usually ends with a full stop ("QR codes that / never expire.", "How it / works."). Pages that change the headline at runtime call `setHeadline(line1, line2)` from `src/headline.js`; it sets text only, never HTML. A page with a one-word title ("Your codes", "Sign in") uses line one only.

**The Weight Not Size Rule.** Do not add new font sizes. Pick the nearest role above and change weight if you need emphasis.

## Layout

- **Mobile first.** Base styles target a 360px phone. Wider layouts are added at `min-width: 720px` and `min-width: 1024px`, at the bottom of `style.css`.
- **Container:** `main` is centred, `max-width: 1200px`, with side padding `--gutter` (20px on phones, 32px from 720px). The top bar and footer use the same width, so their rules line up with the content.
- **Reading pages** (`main.page`: about, privacy, FAQ, sign-in) narrow to `46rem`.
- **Home** (`main.home`): a compact hero (40px top, 28px below), then the studio, then the bridge cards and the story cards, 56px apart. The studio is one column on phones; from 960px it is two columns, 58% controls and 42% preview, 24px apart, with the preview sticky 20px from the top. The home headline is compact on purpose: 2rem on phones, 2.75rem from 720px, so the tool is the first thing to use.
- **Check** (`/check`, `main.check-page`): two cards, input on the left and the verdict on the right (50/50 from 960px, stacked below). Before a check, the verdict card lists the four outcomes with their pills. Vendor and unknown-short-link verdicts end with a "Rescue your printed stock" block that makes a static replacement in place and opens a sticker drawer. `/check?q=<link>` checks a link on load; old `/#check` links redirect here.
- **Page heading** (`.page-head`): 40px above, 28px below, on every non-home page.
- **Dashboard** (`main.dash`): a vertical stack of cards 18px apart. The new-code form becomes a three-column row at 720px (destination, name, button).
- **Tap targets:** every control is at least `--tap` (48px) tall; chips and tabs are 44px.
- **Rhythm:** labels sit 18px above their field and 8px from it; button rows (`.actions`) have 10px gaps and 16px above.

## Elevation & Depth

The system is flat. There are no drop shadows anywhere. Depth comes from tone: Night Ground at the bottom, Panel cards one step up, Raised Panel for inputs and selected states, and wells of Night Ground sunk back into a card for the tab track and drop zone. Every edge is a 1px line. The only `box-shadow` in the CSS is a 1px inset line on the selected tab, which is a border, not elevation.

### Named Rules
**The No Card In A Card Rule.** A card never contains another card. To divide a card into parts, draw a 1px `--line` rule (`border-top: 1px solid var(--line)`) and add padding, as the studio's frame section, its expanders, the checker verdict, the dashboard code rows and the FAQ items all do. Inputs, the tab track, the drop zone, the decoded block and the QR preview are controls or content, not cards, and may sit inside one.

## Shapes

Soft, friendly corners on a strict three-step scale, plus round for anything pressable.

- **Cards:** 20px (`--r-card`).
- **Drop zone:** 16px, dashed 1px border. It is the only 16px shape.
- **Fields:** 12px (`--r-field`) for inputs, selects, textareas, the colour picker, the decoded block and the QR preview.
- **Pills:** 999px (`--r-pill`) for every button, tab, tab track, type chip, status pill and the skip link.
- **Circles:** timeline icons (44px) and the 8px dot inside each status pill.

Borders are always 1px. Dashed borders mean "drop or fill something here" (drop zone, empty QR placeholder) and are used for nothing else.

## Components

### Top bar
Slim and quiet. A 1px `--line` rule along the bottom, content inside the 1200px container with 8px vertical padding. The 26px logo mark (`public/logo.svg`) and "QrOne" on the left, 10px apart (brand role, off-white). Two or three nav links on the right in Small 600, Grey, turning Off-White on hover, with 14px by 12px padding so each is a full tap target. The home page links to "Check a code" and FAQ; other pages link to Make, Check and FAQ. The current page's link is Off-White (`aria-current="page"`). No buttons, no blue, no sign-up call to action in the bar.

### Headline
`h1.hero-title` with one or two `span.line` children (see the Two-Line Headline Rule). It is followed by a `.hero-sub` subline in Title size, Grey, 14px below. On the home page a Lamp Blue text link ("Already printed a code? Check if it will expire →") sits under the subline and leads to `/check`. Sign-in rewrites its headline through `setHeadline`.

### Card
- **Background:** Panel, with a 1px Hairline border.
- **Corner:** 20px.
- **Padding:** 20px on phones, 28px from 720px.
- **Shadow:** none.
- **Inside:** divide with 1px rules, never nested cards. Lists inside a card (`.code-list`, `.faq-list`) put the padding on the sides only and let each row carry its own vertical padding and top rule.

### QR studio (home)
Two panels. **Controls** are one card: the type chips, the fields, then a 1px rule and the "Print frame and label" choice, then two expanders ("Style, colour and logo"; "Print a sheet of stickers"). **Preview** is a Panel with a dot grid (1px Hairline Strong dots every 18px) holding the white paper card, two status pills ("Static · never expires" in Green; "Print-safe contrast" in Green or "Low contrast" in Amber), the primary "Download SVG (best for print)" and a ghost "Download PNG (high resolution)", both full width, and a centred hint. Until something is typed the preview shows an example code with an "Example" tag and the download buttons are disabled.

### Frame choice
Four radio buttons styled as 12px-corner tiles (2 per row on phones, 4 from 720px, icon above the name): None, Bottom pill, Top banner, Box frame. Icons are 22px line drawings, with filled shapes for the label part. Choosing a frame shows the label field (24 characters at most) and quick-pick chips: small 40px ghost pills. The frames themselves are drawn by `src/frame.js` in the code's own colours, outside the code's blank border, so they never affect scanning.

### Type chips (Link / Text / Wi-Fi / Email)
Real radio buttons, visually hidden, with a `span` styled as a pill: 44px tall, four equal columns on the home page, 1px Hairline Strong border, Grey text. Hover: Off-White text, Hairline Hover border. Selected: Raised Panel fill, Off-White text, Lamp Blue border. Keyboard focus draws the standard focus ring around the pill.

### Inputs
- **Style:** Raised Panel fill, 1px Hairline Strong border, 12px corners, 11px by 14px padding, at least 48px tall, Body text.
- **Big variant** (`input.big`): 56px tall, Title size. Used for the one main field on a screen (the home URL field).
- **Hover:** border goes to Hairline Hover.
- **Focus:** the border disappears and a 2px Lamp Blue outline sits 1px outside.
- **Placeholder:** Faint Grey.
- **Labels:** always a visible `<label>` above the field, Label 600. Never use the placeholder as the label.
- **Errors:** a `p.msg-error` under the field, Small 600, Red. Warnings use `p.msg-warn` in Amber. Empty message elements hide themselves.
- **Side by side:** `.pair` for two equal columns; `.pair-tight` for field plus button, which stacks below 480px.

### Buttons
All buttons are pills, 48px tall, 22px side padding, Label 700, with a 120ms colour transition and a 1px press-down on `:active`. Disabled buttons drop to 50% opacity.
- **Primary** (`.btn .btn-primary`): solid Signal Blue, white text, no border. Hover darkens to Signal Blue Pressed. No gradient, no glow, no shadow. One per screen.
- **Ghost** (`.btn`): transparent with a 1px Hairline Strong border and Off-White text. Hover fills Raised Panel and the border goes to Hairline Hover. The default for every secondary action (SVG, Check, QR code, Copy link, plan choices, export formats).
- **Quiet** (`.btn .btn-quiet`): no border, Grey text, turning Off-White on hover. For low-stakes or backing-out actions: Sign out, Close, Cancel, Remove logo, Delete. A destructive action stays quiet and asks for confirmation; it does not turn red.

### Expanders
Native `<details>`. The summary is a full-width 48px row in Label 600 with a drawn chevron (two 2px Grey borders rotated 45 degrees) on the right that flips in 160ms when open. The "Colour, size and logo" expander sits inside the tool card under a 1px top rule. FAQ items (`.faq`) use the same pattern at 60px tall with Title-size questions, separated by 1px rules inside one card.

### Drop zone
A `<label>` wrapping a hidden file input, so the whole area opens the file picker. Night Ground well, 1px dashed Hairline Strong border, 16px corners, 22px padding, content stacked and left-aligned: a Title 700 line ("Drop a QR image"), the screen's primary button, and a Small hint. Hover or drag-over turns the border Lamp Blue; keyboard focus draws the focus ring around the whole zone.

### Verdict (checker result)
The verdict appears inside the tool card, separated from the input above by a 1px top rule and 20px of padding (not a separate card). From top to bottom: a status pill, a Headline-size title (12px above, 14px below), a Small 600 Grey "The code says" label, the decoded content in a mono block (Raised Panel, 1px Hairline, 12px corners, wraps anywhere), Grey explanation paragraphs capped at 60ch, then optional "What you can do" (Label-size `h4` and a bullet list) and a ghost-button form. It plays the arrive animation when it appears. Decoded content is always text, never a live link.

### Pills (status)
Inline pill, 5px by 12px padding, Small 700, with an 8px dot in the current colour before the text. Four tones, chosen in code (`tone` in `src/checker.js` and `src/account.js`):
- `.pill-ok`: Green on its tint.
- `.pill-warn`: Amber on its tint.
- `.pill-bad`: Red on its tint.
- `.pill-neutral`: Grey on Raised Panel, for neutral facts like "Expires in 14 days".
Pills are labels, not buttons: they are never clickable.

### QR preview
Codes are always shown on white. On the home page the preview is the downloaded file itself (an `<img>` of the framed SVG) on a white paper card: 14px padding, 12px corners, at most 320px wide. In the dashboard the code sits in `.qr-box` (white, 6px padding, at most 220px), with an optional label previewed as a black pill under it. Every code has a blank border at least 4 modules wide (`quietZone` in `src/frame.js`).

### Bridge cards ("Static or editable")
Two cards side by side from 720px. Each opens with an uppercase Small 800 tag (Green "Free forever"; Lamp Blue for the paid card), a Title 800 heading and a tick list in Grey (ticks are drawn with two 2px borders, not emoji), then a Faint footnote. The paid card carries a 2px Signal Blue top border. It never lists a feature that isn't built.

### Story cards ("What happens after you print")
Three cards in a row from 720px: a Faint Small 700 "when" line, a Title 800 heading and one Grey sentence. Claims about other vendors stay general ("many", "some") unless a vendor's own page is linked.

### Dashboard workspace
A top bar with the Display-size title, a plan pill (Green on paid plans, neutral on Free), usage in tabular numbers and the email, then an outlined "Upgrade, pay once" (hidden on Pro) and a quiet Sign out. On Free, an Amber-tint banner says codes stop after 14 days. Three tabs in a Night Ground pill track (My codes, Custom domains, Export and account); below 560px they become three equal columns whose labels may wrap. Create code is the one blue button on the codes tab.

### Dialogs
Native `<dialog>` with `showModal()`: Panel background, 1px Hairline Strong border, 20px corners, a dark 72% backdrop. The QR dialog (up to 760px) shows the framed code on white paper beside the frame choice, label and downloads; the delete dialog (up to 440px) names the code, says what happens to printed copies, and puts focus on the blue "Keep it".

### Dashboard rows
The code list is one card (`ul.code-list.card`) with 20px (28px at 720px) side padding. Each row has 18px vertical padding and a 1px rule above it (except the first). Phone: stacked. From 720px: three columns: name (700) with the short link in mono Lamp Blue beneath it, the destination in Grey, and the status pill at the right; the row of ghost action buttons (QR code, Copy link, Change destination) and a quiet Delete runs full width below. Editing a destination swaps the destination text for an inline field with a ghost Save and quiet Cancel. Counts and prices use tabular numbers.

### Footer
Same width as the content, a 1px Hairline rule on top, 22px above and 36px below. Left: one Faint Grey sentence ("QrOne runs in your browser."). Right: FAQ, About, Privacy as Grey links without underlines, turning Off-White on hover. Small size throughout.

### Motion
There is one authored animation, `arrive`: 320ms, `cubic-bezier(0.16, 1, 0.3, 1)`, from 40% opacity and 6px lower to rest. It plays when the Make result first shows and when a verdict renders. It starts mostly visible, so content is never hidden if the animation fails. Everything else is a short state transition: 120ms on button colours, 160ms on the expander chevron. Under `prefers-reduced-motion: reduce`, all animations and transitions are switched off. Do not add a second animation; reuse `arrive` for "a result has appeared".

## Do's and Don'ts

### Do:
- **Do** start every new page from an existing one: copy the skip link, top bar, `main`, `.page-head` with `h1#headline.hero-title`, and footer from `about.html` (reading page) or `dashboard.html` (tool page).
- **Do** use the `:root` variables (`var(--surface)`, `var(--r-card)`, `var(--t-h2)`) instead of hex or pixel values.
- **Do** give each screen exactly one `btn-primary`. On a pricing page, every plan button is a ghost `.btn`; on an account settings page, Save is the primary and everything else is ghost or quiet.
- **Do** put related content in a 20px card and split it with 1px `--line` rules.
- **Do** show any QR code on pure white (#ffffff) with 6px padding.
- **Do** show a code's state or a check result as a `.pill` with the right tone, and name the state in words ("Expired", not just red).
- **Do** keep every control at least 48px tall with a visible label above it.
- **Do** draw icons as inline SVG at 1.75 stroke with round caps and joins, coloured by `currentColor`.
- **Do** keep reading text at 65ch or narrower and in Grey, with Off-White for emphasis.

### Don't:
- **Don't** put a card inside a card.
- **Don't** use blue as a fill anywhere except the one primary button; don't make a second button blue "because it's also important".
- **Don't** use green, amber or red for buttons, headings, icons or decoration.
- **Don't** add gradients, glows, shadows or shine to buttons, or drop shadows to cards.
- **Don't** use the logo's blue-to-mint gradient anywhere else. It belongs to the mark (`public/logo.svg`, also the favicon) and nothing else on the page.
- **Don't** add countdown timers, "only today" offers or any other fake urgency.
- **Don't** add testimonials, user counts, ratings or customer logos; none exist yet, and none may be invented.
- **Don't** use emoji as icons.
- **Don't** add a second typeface, load fonts from a CDN, or invent new font sizes.
- **Don't** add a light theme or light sections; the system is dark only.
- **Don't** add new animations; reuse `arrive`, and keep it off under reduced motion.
- **Don't** name or disparage competitors in UI copy; state vendor behaviour only with a link to the vendor's own page.
