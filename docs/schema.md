# Lorecraft Studio Schema

The schema is defined with Zod in `packages/core/src/schema.ts` and exported from `@adventurekit/core`. Content files are plain JSON so agents can author Lorecraft Studio projects without editing runtime code. The package name remains a compatibility alias during the product rebrand.

## Top-Level Shape

```ts
interface GameDefinition {
  metadata: {
    id: string;
    title: string;
    genre: string;
    author: string;
    summary: string;
  };
  startScene: string;
  variables: Record<string, string | number | boolean | null>;
  items: ItemDefinition[];
  storyBible?: StoryBible;
  characters: CharacterDefinition[];
  assets: AssetDefinition[];
  gameplayHooks: GameplayHook[];
  scenes: SceneDefinition[];
  endings: EndingDefinition[];
}
```

## Scenes

Scenes drive cinematic flow:

```ts
interface SceneDefinition {
  id: string;
  title: string;
  purpose?: string;
  synopsis?: string;
  location?: string;
  camera?: string;
  background: string;
  backgroundPrompt?: string;
  layoutNotes?: {
    mobileLandscape: string;
    mobilePortrait?: string;
    tablet?: string;
    desktop?: string;
  };
  assetIds?: string[];
  mood: string[];
  blocks: ContentBlock[];
  choices?: Choice[];
}
```

`background` is the in-runtime scene descriptor. `backgroundPrompt` is the image-generation prompt for the eventual background asset. Studio projects must include `layoutNotes.mobileLandscape` and a `backgroundPrompt` for every scene.

## Blocks

Supported block types:

```json
{ "type": "narration", "text": "The camera finds the room already in motion." }
```

```json
{ "type": "dialogue", "speaker": "Mara", "text": "Give me the first clean signal." }
```

```json
{
  "type": "gameplay_hook",
  "hookId": "rapid-assessment"
}
```

Hook blocks can reference a top-level `gameplayHooks` entry with `hookId` or carry a legacy inline `hook`.

## Studio Objects

Studio projects can include:

- `storyBible`: premise, tone, visual direction, pacing rules, cast, locations, boundaries, and module plan.
- `characters`: role, biography, visual description, base portrait prompt, emotions, stances, positions, and variants.
- `assets`: backgrounds, character portraits, CG, overlays, evidence, and hook concepts with prompt, status, linked scenes, and linked characters.
- `gameplayHooks`: first-class gameplay module specs with narrative purpose, player inputs, success/failure targets, layout notes, mobile notes, implementation notes, asset requirements, and agent prompt.

## Choices

Choices point to scenes or endings and can apply effects:

```json
{
  "id": "take-key",
  "label": "Take the key",
  "target": { "type": "scene", "id": "locked-door" },
  "effects": [
    { "type": "addItem", "itemId": "key" },
    { "type": "incrementVariable", "variable": "trust", "by": 1 }
  ]
}
```

Conditional choices use all listed conditions:

```json
{
  "id": "use-key",
  "label": "Use the key",
  "target": { "type": "scene", "id": "beyond-door" },
  "conditions": [{ "type": "hasItem", "itemId": "key" }]
}
```

Supported conditions:

- `hasItem`
- `notHasItem`
- `variableEquals`
- `variableNotEquals`
- `variableAtLeast`
- `variableLessThan`

Supported effects:

- `setVariable`
- `incrementVariable`
- `addItem`
- `removeItem`

## Validation

`validateGame(input, source)` performs schema validation and cross-reference validation. It checks:

- malformed fields
- duplicate scene, ending, item, and hook ids
- missing `startScene`
- missing choice targets
- missing hook targets
- item references in effects and conditions
- broken character, asset, story bible, hook, and item image references
- missing Studio scene prompts and mobile landscape layout notes
- missing Studio hook layout notes and agent prompts

Use `formatValidationErrors(errors)` to display understandable validation output.
