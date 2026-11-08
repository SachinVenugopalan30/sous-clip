# Sous Clip v2 · Four directions

Four complete visual directions for the v2 redesign, built as standalone HTML. This work lives on `fr-1` and is independent of anything in `design/v2`; none of it was opened or reused.

Open `design/fr-1/index.html` in a browser. There is no build step and no dependency install. The pages use local webfonts from `assets/fonts/` and remote Unsplash photography as stand-in imagery.

## The four directions

| # | Direction | World | Palette | Type | Extraction metaphor |
|---|---|---|---|---|---|
| 01 | **Mise** | Warm editorial cookbook | Current app palette: paper `#FDFAF5`, espresso `#1C1917`, terracotta `#C2410C`, herb `#15803D` | Fraunces, DM Sans, JetBrains Mono | Horizontal station line |
| 02 | **Order Up** | Kitchen pass and ticket rail | Ticket `#F7F1E3`, steel `#E3E5E7`, ink `#15130F`, signal `#D9480F`, done `#2F6B4F` | Big Shoulders Display, Hanken Grotesk, IBM Plex Mono | Three-column pass with stamps |
| 03 | **Night Kitchen** | After-hours fine dining | Night `#0B0B0C`, surface `#141416`, warm white `#F4EFE6`, copper `#D98E4A`, sage `#8FA98A` | Instrument Serif, Inter Tight, Geist Mono | Vertical service monitor with waveform |
| 04 | **Larder** | Bright specialty grocer | Cream `#FFF9EF`, deep green `#143D2B`, tomato `#E94B35`, butter `#F6C453`, cobalt `#2B4C9B` | Bricolage Grotesque, DM Mono | Market scale dial |

Mise is the only direction that keeps the current app palette. The other three are new worlds, chosen from the product's own kitchen and food-shop language rather than generic dashboard styles.

## What each direction includes

Every direction is a full presentation page, not a single screenshot. Each one covers:

- **Library**: search, filters, a featured recipe, a secondary index or shelf, selection and a bulk action bar.
- **Extraction**: URL entry, live queue, named stations, percentage or progress, failure and retry states.
- **Recipe**: ingredients with check-off, servings or scaling, method, timers, source link, share and Mealie actions.
- **Phone**: library, capture and recipe screens in the same visual world as the desktop app.
- **Settings and system**: palette, type, motion, component states, and a settings panel for AI provider, Whisper, Mealie and updates.

The presentation pages also show the palette, typography, motion timings, empty/loading/error states and the design rationale for each direction.

## Files

```
design/fr-1/
  index.html                 four-direction gallery
  README.md                  this file
  01-mise.html               current palette, editorial cookbook
  02-order-up.html           steel rail, paper tickets, stamps
  03-night-kitchen.html      dark cinematic service
  04-larder.html             bright specialty grocer
  assets/
    base.css                 shared presentation mechanics and device frames
    mock.js                  reveals, tabs, pipeline replay, theme toggle, live time
    fonts/                   local woff2 files and fonts.css
  previews/                  gallery screenshots
```

## Motion

The shared layer handles scroll reveals, tab switching, pipeline replay, live timestamps and a scrolled-header state. Each direction adds its own signature:

- **Mise**: image clip-in, hairline pipeline fills, image zoom on hover, ingredient strike-through.
- **Order Up**: stamp-in, ticket lift, rail stubs, a paper pass that reads as a physical object.
- **Night Kitchen**: slow hero image scale, copper ambient pulse, live waveform bars, vertical station glow.
- **Larder**: market dial sweep, shelf lift, pill controls and image zoom.

All motion respects `prefers-reduced-motion`. Capture mode (`?capture`) freezes entrances so screenshots are stable.

## Accessibility notes

- Body and control contrast targets WCAG AA in every direction.
- Focus rings are visible; controls are real buttons and inputs, not images.
- Phone screens use the same type hierarchy as desktop, with larger tap targets in the real implementation.
- Information is never carried by color alone: done/active/failed states also have text labels and icons.
- The mockups are design presentations. The production implementation should keep the 44px touch target, keyboard focus and reduced-motion behavior from `PRODUCT.md`.

## Product truth

The product facts, terminology, states and constraints used here are in [`PRODUCT.md`](../../PRODUCT.md). The short version: Sous Clip is a self-hosted, MIT-licensed recipe extractor for short-form cooking videos. It downloads with yt-dlp, transcribes with Whisper on the user's server, writes the recipe with the user's chosen AI model, stores everything in SQLite, and optionally forwards to Mealie.

## Photography

Photography is stand-in imagery from Unsplash, used to show the layout with real food rather than placeholder blocks. Replace with the client's own captures before shipping.
