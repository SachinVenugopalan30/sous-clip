# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing: React 19 + Vite + TanStack Router + Tailwind CSS v4 + shadcn/ui + Motion. Backend is FastAPI + Temporal + SQLite. The v2 mockups are standalone HTML/CSS/JS design presentations; they do not change the app stack.

## Users

Home cooks who save recipes from short-form video (YouTube Shorts, Instagram Reels, TikTok), usually on a phone at the moment they see the video, then cook from the saved recipe later. A second audience is self-hosters who run the app in Docker on their own hardware and care where their data lives.

## Product Purpose

Turn a cooking video into a clean, editable recipe (ingredients, steps, times, servings) saved in a private library. Success is a recipe that is good enough to cook from without reopening the video.

## Positioning

The only self-hostable, privacy-first recipe extractor built for the short-form video era. The video is transcribed on the user's own server with Whisper, the recipe is written by the AI model the user chooses (including a local model), and the library lives in one SQLite file the user owns. It is free and MIT licensed.

## Operating Context

- Phone-first capture: share a link from the video app into Sous Clip, or paste it.
- Server-side pipeline: yt-dlp download, Whisper transcription, AI extraction, save, optional Mealie forward.
- Desktop and tablet browsing, searching, filtering by time/tag/date, scaling servings, editing, sharing a public link.
- Self-hosted install via Docker or Podman; settings for AI provider, Whisper model/device, Mealie, and updates.
- A queue is visible while extraction runs, with per-step progress and recoverable errors.

## Capabilities and Constraints

- Sources: YouTube Shorts, Instagram Reels, TikTok. Long-form is untested.
- AI providers: Anthropic, OpenAI, Ollama, and custom OpenAI- or Anthropic-compatible endpoints.
- Transcription: faster-whisper on CPU or NVIDIA GPU.
- Storage: SQLite; recipes never leave the server.
- Optional Mealie integration for one-off and bulk forwarding.
- PWA install and Android share-sheet target; iOS uses paste when the share sheet is unavailable.
- Auth is a single app password, not multi-user accounts.
- Real states that the UI must cover: loading, empty library, no filter matches, extraction queued, extraction in progress, extraction failed, extraction complete, offline/PWA, settings saved, invalid URL, Mealie unreachable, update available.

## Brand Commitments

- Name: Sous Clip.
- Voice: plain, dry, kitchen-line language. "Order in", "On the line", "Order up", "No. 0412", "the pass". Never cute or exclamatory.
- The marketing site (https://sous-clip-web.pages.dev/) is the current brand reference: steel grey, white paper, ink, orange, condensed display type, order-ticket artifacts, steel rail, clips, rubber stamps.
- The product is free, open source, MIT, and self-hosted. Do not imply a hosted service, subscription, or account system.
- The current app palette (cream #FDFAF5, espresso #1C1917, terracotta #C2410C, herb green #15803D) is one required direction, not the only permitted one.

## Evidence on Hand

- Real extracted recipes used on the marketing site: Steamed Pork Dumplings (Layered Wrapper Style), Teriyaki Sauce, Instant Kimchi (No Fermentation), Cleaned Bacon Fat, Korean BBQ Hawaiian Roll Sliders, Cheese Sauce.
- Current app screenshots in `docs/screenshots/`.
- Marketing site markup and CSS: order-ticket hero, steel rail, recipe stubs, `Big Shoulders Display` + `Hanken Grotesk`, ink/orange palette.
- No real user testimonials, usage numbers, or press quotes. Do not invent them.

## Product Principles

1. The recipe is the hero; the interface gets out of the way once cooking starts.
2. Private by default. The UI should feel like something that runs on your own machine, not a SaaS dashboard.
3. Show the work. Extraction is a visible line with named stations, not a spinner.
4. Phone capture, desktop cooking. Both surfaces must feel like the same product.
5. Kitchen language over software language: orders, stations, the pass, service, prep, mise.

## Accessibility & Inclusion

- WCAG AA contrast for body text, controls, and focus states in every theme.
- Keyboard reachable controls with visible focus rings.
- Touch targets at least 44px on phone layouts.
- Motion respects `prefers-reduced-motion`; no essential information is carried only by animation or color.
- Ingredient and step text stays at a comfortable reading size while cooking, including at 200% zoom.

## v2 redesign brief (user, 2026-11-08)

- The current UI reads bland; v2 must be visually appealing and beautiful.
- Smooth, consistent animations throughout; theme matching everywhere.
- The design should rhyme with the rewritten marketing site's kitchen-ticket language.
- Four fresh mockups in `design/v2/`: one follows the current app palette; three explore new palettes suited to the product.
- Work happens on branch `fr-3`.
