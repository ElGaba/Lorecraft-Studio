# Mobile-First Design

Lorecraft Studio targets mobile landscape first, then adapts to portrait, tablet, and desktop.

## Principles

- Keep the cinematic stage readable at 16:9.
- Keep choices, hook controls, and mode switches touch-safe.
- Use DOM overlays for text-heavy UI, evidence, menus, and settings.
- Keep gameplay module inputs tap-first; avoid precision dragging unless a module has a strong reason.
- Preserve safe-area padding.
- Ensure portrait mode stacks rather than shrinking text.

## Studio Preview

The preview controls in `apps/studio-demo/src/App.tsx` switch between Mobile Landscape, Mobile Portrait, Tablet, and Desktop. Frame sizing lives in `apps/studio-demo/src/styles.css`.

## Runtime

`@adventurekit/react-runtime` uses a stage plus side rail on wide screens and stacks under narrow widths. Hook cards and choices keep minimum touch heights.
