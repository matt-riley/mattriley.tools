# Style Lock — mattriley.tools

## Direction contract

- **Thesis**: "An engineered index of published instruments" — the catalog reads as a typeset instrument index: editorial composition, hairline engineering traces, honest data readouts.
- **First viewport**: oversized stacked display headline (Built. Published. Versioned.) + mono eyebrow/sync line + one terminal visual (sync pipeline, data-driven from `generatedAt`), primary CTA "Browse the index".
- **System**: custom dark editorial-technical lane (editorial-tech skill), no component registry (Astro static, not React/Tailwind).
- **Risk**: monotony across 84 cards; mitigated by chapter accents, count-ups, and staggered reveals.

## Macrostructure

Editorial Index (chapter-anchored catalog). Rotation vs prior build: previous site was neon-brutalist single-column vertical rhythm.

## Color contract

- bg `#0B0B0E`, surface `#15151A`, surface-2 `#1A1A21`, text `#EFEEE7`, muted `#9C9BA6`, border `#7A7985` (hairline alpha in code)
- Domain accents (restrained, markers only): cyan `#5AD2F2`, green `#4DE08A`, magenta `#F26BD6`, orange `#FF9248`
- Verified: text/bg 16.9:1 text-safe; muted/bg 7.2:1 text-safe; accents on bg >= 11.2:1 text-safe; surface/border 4.25 UI-safe. Legal pairings per check_contrast matrix; text-on-accent is forbidden (`text x accent` 1.51 decorative).

## Type

- Display: Space Grotesk Variable (self-hosted) — hero clamp(3rem,10.5vw,8.75rem) 650w, uppercase, -0.025em
- Utility: JetBrains Mono Variable — labels/numbers/code, 0.68–0.8rem, +0.08–0.14em tracking

## Density & spacing

- Scale 4/8/12/16/24/32/48/64/96/128. Section rhythm generous: hero 12vh+, chapters clamp(4rem,9vh,7rem). Cards: 24px internal ≤ external gap 20px (gap is 20px internal 24 — nearest scale compromise; keep gap >= padding at 1280px using minmax 295px grid; mobile single-col gap 16px/pad 24px).
- Radius 4px. Border 1px hairlines. No gradients, no shadows beyond single terminal depth shadow.

## Assets

- No photography/illustration: content is data-first (tools/plugins/skills/templates); visuals are honest, data-driven UI (terminal panel built from generated data) + typographic glyphs (◆ ↗ ↓ →) instead of an icon library. README images mirrored from source repos serve detail pages.
- Logo: preserved existing favicon mark (house M). Fonts self-hosted via Fontsource.
- Motion stack: Lenis (sole smooth-scroll engine) + GSAP ScrollTrigger; masked word reveals, card batch entrances, count-ups. No Three.js. Reduced-motion renders final states.

## Dark mode

Dark-only (locked); theme-color `#0B0B0E`.

## Build stamp (first line of global.css)

`mattriley.tools — "Engineered Index" design system · Macrostructure: Editorial Index · Mood: technical · Mode: dark · contrast verified`
