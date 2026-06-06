# Gameplay Hooks

Gameplay hooks are first-class Studio objects and playable runtime placeholders. They let a project describe future interaction modules without blocking the narrative playthrough.

## Top-Level Hook

```json
{
  "id": "present-contradiction",
  "type": "evidence_presentation",
  "title": "Present the Contradiction",
  "module": "future-contradiction-presentation-module",
  "narrativePurpose": "Mara must prove the witness's final answer cannot be true.",
  "gameplayPurpose": "Select testimony and present evidence.",
  "expectedPlayerAction": "Select the window statement and present the crime scene photo.",
  "requiredInputs": ["testimony_statement", "evidence_selection"],
  "successCondition": "Statement four plus crime scene photo.",
  "failureCondition": "Wrong statement or irrelevant evidence.",
  "successTarget": { "type": "scene", "id": "witness-cracks" },
  "failureTarget": { "type": "scene", "id": "objection-sustained" },
  "uiLayoutNotes": "Statement cards center, evidence tray right.",
  "mobileGestureNotes": "Tap statement, tap evidence, press present.",
  "futureModuleType": "contradiction",
  "implementationNotes": "Core contradiction module candidate.",
  "assetRequirements": ["asset_window_photo"],
  "agentPrompt": "Design contradiction gameplay for an impossible open window testimony.",
  "notes": "Primary evidence hook."
}
```

## Scene Block

Scenes mount a hook by id:

```json
{ "type": "gameplay_hook", "hookId": "present-contradiction" }
```

Inline hooks are still supported for compatibility, but top-level hooks are preferred because Studio can list, validate, export, and reuse them.

## Runtime Display

Each hook shows the id, type, future module, success/failure targets, narrative purpose, expected action, required inputs, and buttons to simulate success or failure.

The core engine resolves hook outcomes through `resolveGameplayHook(state, hookId, outcome)`.

## Module Attachment

`packages/phaser-bridge/src/index.ts` defines the adapter shape:

```ts
interface GameplayModuleAdapter {
  id: string;
  hookTypes: string[];
  mount(element: HTMLElement, context: GameplayModuleMountContext): void | (() => void);
}
```

A future module should match one or more hook types, mount into a runtime-owned element, read serializable runtime state, call `resolve("success")` or `resolve("failure")`, and clean up renderer resources when unmounted.

## Validation Rules

Validation catches missing hook ids, broken success/failure targets, missing asset requirements, invalid item effects, missing Studio layout notes, and missing agent prompts.
