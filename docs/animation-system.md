# Animation System

Lorecraft Studio supports named animation presets in scene blocks and character variants.

## Presets

- `fade-in`
- `slide-in-left`
- `slide-in-right`
- `subtle-breathing`
- `tense-shake`
- `evidence-slam`
- `tool-ready`
- `dramatic-zoom`
- `camera-pan`
- `flash-cut`
- `screen-shake`
- `pulse-alert`

## Runtime Mapping

`packages/react-runtime/src/runtime.css` maps presets to CSS classes prefixed with `ak-anim-`. The runtime respects `prefers-reduced-motion` and disables preset animations when reduced motion is requested.

## Authoring Guidance

Use motion to clarify state changes: evidence reveals, tool readiness, pressure spikes, scene transitions, and alert moments. Avoid using constant motion on long text.
