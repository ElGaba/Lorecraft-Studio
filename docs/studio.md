# Lorecraft Studio

Lorecraft Studio is the local authoring app in `apps/studio-demo`. It does not require a backend, database, auth, payments, or cloud services.

The user-facing product name is Lorecraft Studio. Internal packages still use `@adventurekit/*` as compatibility aliases during the transition.

## Modes

- Studio: inspect and edit scenes, characters, assets, story bible fields, gameplay hooks, settings, and export files.
- Play: run the selected project inside the responsive preview frame.
- Play Chapter: launch The Last Testimony into the dedicated full-screen-style Chapter 1 playthrough shell.

## Authoring Areas

- Project dashboard: scene, cast, and hook counts for the selected project.
- Scene Editor: rich scene metadata, background prompt, layout notes, asset ids, agent buttons, and validation.
- Character Editor: role, visual description, base portrait prompt, emotions, stances, and variants.
- Asset Prompt Manager: background, portrait, CG, overlay, evidence, and hook concept prompts with status.
- Gameplay Hook Manager: narrative purpose, player action, future module, mobile notes, and agent prompt.
- Story Bible: premise, tone, play style, visual direction, and writing guide.
- Export Package: generated files ready for handoff.

## Flagship Focus

The Last Testimony is the flagship project. It should be the default project and the main target for Chapter 1 polish, gameplay integration, animation work, and export improvements. Its source data now carries the Chapter 1 content floor: 18 scenes, 7 characters, 10 evidence items, 8 gameplay hooks, variable-driven choices, and 3 outcomes.

## Preview Modes

Studio and Play share preview controls for Mobile Landscape, Mobile Portrait, Tablet, and Desktop. Mobile landscape is the primary target.

## Local State

Edits are local to the running app session. Content source files are still the canonical package data under `content/*/game.json`.
