# Gameplay Hooks

Gameplay hooks let AdventureKit stay playable before full gameplay modules exist. A hook is a declarative block in a cinematic scene. The React runtime renders a polished placeholder and exposes demo buttons for success and failure.

## Hook Shape

```json
{
  "type": "gameplay_hook",
  "hook": {
    "id": "present-contradiction",
    "type": "evidence_presentation",
    "module": "future-contradiction-presentation-module",
    "successTarget": { "type": "scene", "id": "witness-cracks" },
    "failureTarget": { "type": "scene", "id": "objection-sustained" },
    "successEffects": [{ "type": "incrementVariable", "variable": "witnessPressure", "by": 2 }],
    "failureEffects": [{ "type": "incrementVariable", "variable": "judgePatience", "by": -1 }],
    "notes": "Future module can let players select evidence and point to the exact testimony line."
  }
}
```

## Runtime Display

Each hook shows:

- hook id
- hook type
- intended future module
- success target scene or ending
- failure target scene or ending
- short design notes
- `Simulate Success`
- `Simulate Failure`

The core engine resolves hook outcomes through `resolveGameplayHook(state, hookId, outcome)`.

## Future Module Attachment

`packages/phaser-bridge/src/index.ts` defines the first adapter shape:

```ts
interface GameplayModuleAdapter {
  id: string;
  hookTypes: string[];
  mount(element: HTMLElement, context: GameplayModuleMountContext): void | (() => void);
}
```

A future module should:

1. Match one or more hook `type` values.
2. Mount into the element owned by the runtime.
3. Read the hook and runtime state from the context.
4. Call `resolve("success")` or `resolve("failure")`.
5. Clean up renderer resources when unmounted.

The hook remains content-authored JSON. Runtime code should not need scene-specific changes.
