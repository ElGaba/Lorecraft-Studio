# AdventureKit Schema

The schema is defined with Zod in `packages/core/src/schema.ts` and exported from `@adventurekit/core`. Content files are plain JSON so agents can author prototypes without editing runtime code.

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
  background: string;
  mood: string[];
  blocks: ContentBlock[];
  choices?: Choice[];
}
```

`background` is a descriptor for code-native placeholder visuals. `mood` gives the runtime and future renderers atmospheric tags.

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
  "hook": {
    "id": "rapid-assessment",
    "type": "procedure_interaction",
    "module": "future-rapid-assessment-module",
    "successTarget": { "type": "scene", "id": "safe-handoff" },
    "failureTarget": { "type": "ending", "id": "hard-lesson" },
    "notes": "Future module can sequence airway, rhythm confirmation, and escalation."
  }
}
```

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

Use `formatValidationErrors(errors)` to display understandable validation output.
