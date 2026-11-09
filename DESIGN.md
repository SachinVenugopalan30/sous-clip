---
name: Sous Clip, Night Service
description: A dark-first kitchen at night. Photo-led recipes, one top bar, extraction as an order on the line.
colors:
  espresso: "#1C1917"
  espresso-card: "#292524"
  espresso-muted: "#23201E"
  cream: "#FDFAF5"
  paper-card: "#FFFDF9"
  stone: "#F5F0E8"
  terracotta: "#C2410C"
  ember: "#FB923C"
  apricot: "#FDBA74"
  herb: "#15803D"
  herb-night: "#4ADE80"
  sand-border: "#E2D9CC"
  dark-border: "#3B3531"
  ash: "#A8A29E"
  smoke: "#6E6762"
  brick: "#B91C1C"
  brick-night: "#F87171"
typography:
  display:
    fontFamily: "Fraunces Variable, Iowan Old Style, Georgia, serif"
    fontWeight: 400
    lineHeight: 1.02
  body:
    fontFamily: "DM Sans Variable, system-ui, sans-serif"
    fontSize: "15px"
  mono:
    fontFamily: "JetBrains Mono Variable, ui-monospace, monospace"
    fontSize: "12px"
    letterSpacing: "0.06em"
rounded:
  base: "4px"
  pill: "9999px"
---

# Design System: Sous Clip, Night Service

Source of truth: `frontend/src/index.css`. Product truth: PRODUCT.md.

## Overview

**Creative North Star: "Night Service"**

A kitchen after dark: espresso rooms, photographs doing the talking, the recipe as hero. Dark is the shipped look; light is supported and follows the user's choice or `prefers-color-scheme`. Full-bleed photos under a scrim, Fraunces headlines with one italic word, mono numerals, flat surfaces, motion that is slow in and quick out.

## Colors

One terracotta accent on warm neutrals. CSS variables on `:root` and `.dark`.

| Token | Light | Dark |
|---|---|---|
| `--background` / `--foreground` | `#FDFAF5` / `#1C1917` | `#1C1917` / `#FDFAF5` |
| `--card` | `#FFFDF9` | `#292524` |
| `--muted` | `#F5F0E8` | `#23201E` |
| `--muted-foreground` | `#6E6762` | `#A8A29E` |
| `--primary` / `--accent` | `#C2410C` | `#C2410C` |
| `--accent-text`, `--ring` | `#C2410C` | `#FB923C` |
| `--success` | `#15803D` | `#4ADE80` |
| `--destructive` | `#B91C1C` | `#F87171` |
| `--border` | `#E2D9CC` | `#3B3531` |

Over photos text is cream `#FDFAF5`, secondary `#E7E0D6`, italic emphasis apricot `#FDBA74`. `--line-ctl` borders controls at 3:1 in both themes.

**The One Voice Rule.** Terracotta is the primary action, focus and the italic word. No other hue except success and error.
**The Dark Text Rule.** `#C2410C` as text is 2.9:1 on dark; use `--accent-text`.

## Typography

Fraunces (display, optical sizing, weight 400), DM Sans (UI), JetBrains Mono (numerals, times, tickets). Self-hosted via Fontsource.

- **Hero title:** Fraunces `clamp(44px, 8vw, 112px)` on the library, `clamp(38px, 6.6vw, 100px)` on a recipe, line-height 1.02; a parenthetical subtitle is split off in italic.
- **Section head:** Fraunces `clamp(24px, 3vw, 32px)`. **Card caption:** Fraunces 19px.
- **Body:** DM Sans 15px; form fields 16px on phones.
- **Label (`.mono`):** JetBrains Mono 12px, uppercase, 0.06em, tabular numerals.

**The Italic Word Rule.** One `<em>` per headline, in accent colour ("Order *in*.").

## Layout, depth, shape

Full-bleed pages with a 1320px column and `clamp(16px, 4vw, 56px)` gutters; other pages use a 64rem column under the bar. Library: hero, a search panel overlapping it by 28px, chips, then shelves of 9:16 reels (a grid while filtering). Recipe: photo hero with a paper sheet lifted 76px over it. Breakpoints: 640px, 820px.

Flat and tonal. Two shadows only: the search panel and the recipe sheet. Photos carry a scrim so cream text reads. Radius is 4px; filters and nav are pills; round icon buttons are circles.

## Motion

- **Easing:** `--ease` `cubic-bezier(.16, 1, .3, 1)`; `--ease-in-out` `cubic-bezier(.65, 0, .35, 1)` for loops and exits. **Durations:** 160ms, 320ms, 620ms (`--fast`, `--med`, `--slow`).
- `.press` scales to 0.96 on `:active`. `.in` rises 14px and fades, staggered 45ms per item.
- The featured photo zooms slowly (18s); the transcribing waveform pulses.
- **View transitions** on route changes: screens cross-fade; opening a recipe morphs the photo from its tile (460ms, corners square off) while the sheet rises and the title fades in; closing plays it back. The bar has its own group so it never jumps.
- **Theme toggle** wipes a circle outward from the button (620ms), from the centre when used by keyboard.
- **Reduced motion:** durations drop to 1ms, view transitions included; the waveform holds still.

## Components

- **Top bar:** fixed, 68px. Logo; Library, Extract (filled terracotta pill, ringed when current) and Settings centred; stars, theme toggle, username and sign out right. Transparent with a gradient over a photo hero, solid once the hero scrolls behind it. Hides on scroll down, returns after 8px up, and stays while a control has keyboard focus. Under 820px labels and username hide; under 480px the wordmark and stars hide. An offline banner (`role="status"`) sits below it.
- **Library:** latest-recipe hero, search, sort, time/date/tag chips (`aria-pressed`), reels with a mono `No. 0001` tab; select and menu buttons show on hover, always on touch. No photo: an italic title plate. Cmd/Ctrl+K opens a command palette.
- **Extraction:** link field with Paste, Mealie switch, then "On the line": a row per job with a 9:16 plate and four stations (Download, Transcribe, Extract, Saved) on a rail that fills green. While transcribing, a waveform and live captions run over the photo. Cancel and Retry buttons; errors in `role="alert"`; a toast announces a finished recipe.
- **Recipe:** hero, mono meta line, sheet with Edit, Share, .md, .txt, Mealie, Delete; servings stepper; ingredients with mono quantities; numbered italic steps.
- **Controls:** outlined with `--line-ctl`, 4px radius, 44px tall on touch; primary is terracotta with cream text.

## Accessibility

- AA contrast in both themes; ratios noted beside tokens in `index.css`.
- `:focus-visible`: 2px `--accent-text` outline, offset 2px (cream on photo heroes).
- 44px touch targets on phones, with extended hit areas on small buttons.
- Icon-only buttons have `aria-label`; nav is a labelled `nav`; the Mealie switch is `role="switch"`.
- Status never rides on colour or motion alone: stations have text and icons; results use `role="status"` or `role="alert"`.
- Honour `prefers-reduced-motion` everywhere.

## Do's and Don'ts

- **Do** put text over photos only on the scrim, in cream.
- **Do** use mono for numbers, Fraunces for names.
- **Don't** add another accent hue, text gradients or glass blur.
- **Don't** use `--primary` as text on dark.
- **Don't** use bouncy easing; no overshoot.
