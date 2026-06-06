# AdventureKit Studio

AdventureKit Studio is the local authoring mode in `apps/studio-demo`. It does not require a backend, database, auth, payments, or cloud services.

## Modes

- Studio: edit scenes, characters, assets, story bible fields, gameplay hooks, settings, and export files.
- Play: run the selected project through `@adventurekit/react-runtime`.

## Authoring Areas

- Project dashboard: scene, cast, and hook counts for the selected prototype.
- Scene Editor: rich scene metadata, background prompt, layout notes, asset ids, agent buttons, and validation.
- Character Editor: role, visual description, base portrait prompt, emotions, stances, and variants.
- Asset Prompt Manager: background, portrait, CG, overlay, evidence, and hook concept prompts with status.
- Gameplay Hook Manager: narrative purpose, player action, future module, mobile notes, and agent prompt.
- Story Bible: premise, tone, play style, visual direction, and writing guide.
- Export Package: generated files ready for handoff.

## Preview Modes

Studio and Play share preview controls for Mobile Landscape, Mobile Portrait, Tablet, and Desktop. Mobile landscape is the primary target.

## Local State

Edits are local to the running app session. Content source files are still the canonical package data under `content/*/game.json`.
