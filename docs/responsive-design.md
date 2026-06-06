# Responsive Design

Lorecraft Studio's first runtime is mobile-first. The primary target is mobile landscape, with support for portrait, tablet, and desktop previews.

## Layout Priorities

- Keep the cinematic stage dominant.
- Use a 16:9 stage where it fits.
- Keep choices and hook actions at touch-friendly sizes.
- Preserve safe-area padding.
- Stack panels in portrait and narrow widths.
- Keep evidence and variable panels readable without tiny text.

## Studio Preview Modes

The studio demo exposes four preview modes:

- `Mobile Landscape`: the default, optimized around a wide cinematic stage.
- `Mobile Portrait`: a stacked fallback with a compact note and touch-safe controls.
- `Tablet`: a wider frame with side rail room.
- `Desktop`: a large frame for repeated testing and authoring.

Preview controls live in `apps/studio-demo/src/App.tsx`. Frame sizing is controlled by `apps/studio-demo/src/styles.css`.

## Runtime Responsiveness

The reusable runtime CSS lives in `packages/react-runtime/src/runtime.css`.

Key rules:

- `.ak-runtime` uses a stage plus side rail on wider screens.
- `.ak-stage` uses `aspect-ratio: 16 / 9`.
- under `820px`, the runtime stacks into a single column.
- choices and hook controls have minimum touch-friendly heights.
- scene transitions respect `prefers-reduced-motion`.

## Safe Areas

The studio shell uses `env(safe-area-inset-*)` padding so browser chrome and device notches do not cover controls.
