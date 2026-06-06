# Agent Authoring

Lorecraft Studio content is designed for agents that generate structured game files.

## Authoring Flow

1. Create `content/<slug>/game.json`.
2. Pick a stable `metadata.id` matching the folder slug.
3. Define a `startScene`.
4. Write scenes as cinematic beats with narration, dialogue, choices, and hook blocks.
5. Add endings.
6. Run `npm test` or `npm run build` to validate content.
7. Open the studio demo with `npm run dev`.

## Content Rules

- Keep ids stable and readable.
- Prefer small scenes with clear purpose.
- Make every choice target a real scene or ending.
- Use variables for simple state, not hidden prose assumptions.
- Use items for inventory, evidence, or objects that affect choices.
- Use gameplay hooks when the project needs a future interaction module.
- Keep hook notes specific enough that another agent can build the module later.

## Adding A Project Without Runtime Changes

The studio discovers files with:

```ts
import.meta.glob("../../../content/*/game.json")
```

That means a new `content/<slug>/game.json` is enough. If the file is valid, it appears in the Project selector. If invalid, the studio displays formatted validation errors with file paths and schema paths.

## Suggested Scene Pattern

Use this rhythm for a compact playable project:

- Intro scene with a strong cinematic premise.
- Investigation or exploration scene that grants an item.
- Dialogue scene that frames a contradiction or problem.
- Gameplay hook scene.
- Success branch.
- Failure branch.
- At least one ending, preferably two for contrast.

## Quality Bar

The examples in this repository aim for strong placeholder writing rather than generic filler. Scene descriptors should imply lighting, space, and emotional stakes because the renderer uses those descriptors to support cinematic presentation.
