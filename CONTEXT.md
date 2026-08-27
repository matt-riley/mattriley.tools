# Catalog Showcase

A static showcase of Matt Riley's published work and configuration.

## Domains

**Homebrew Tool**:
A CLI tool distributed via a custom Homebrew tap formula.

**Neovim Plugin**:
A Vim/Neovim plugin published as a GitHub repository with `.nvim` in the name.

**Agent Skill**:
A portable instruction set for AI agents, sourced from the `agent-skills` repository.

**Public Template**:
A public GitHub repository marked as a template for scaffolding new projects.

## Visual Language

### "Engineered Index" (2026 redesign)

Dark editorial-technical system: the catalog reads as a typeset index of
instruments. Near-black surfaces, hairline grid traces, oversized Space Grotesk
display type, JetBrains Mono utility labels, and one restrained accent per
domain. Motion is Lenis + GSAP ScrollTrigger only (masked word reveals,
staggered card entrances, count-ups) and fully collapses under
`prefers-reduced-motion`. No WebGL; the hero visual is an honest data-driven
terminal panel fed by the generated sync timestamps.

- **Homebrew Tools**: Cyan `#5AD2F2`
- **Neovim Plugins**: Green `#4DE08A`
- **Agent Skills**: Magenta `#F26BD6`
- **Public Templates**: Orange `#FF9248`

Tokens live in `src/styles/global.css` (contrast-verified: text/bg 16.9:1,
muted/bg 7.2:1, accents on bg ≥ 11:1). The old neon-brutalist palette and the
"no gradients" constraint are superseded; accents are used sparingly — markers,
numbers, hover lines — never as large fills.

## Relationships

- An item belongs to exactly one domain. Naming conventions naturally prevent overlap.
- The domains remain strictly isolated in the catalog presentation.
