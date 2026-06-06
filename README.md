# AdventureKit

AdventureKit is an open-source TypeScript toolkit for building cinematic narrative and adventure game prototypes that run on mobile web, tablet, and desktop. It is designed for agent-first authoring: an AI agent or developer can add a structured `game.json` file, let the runtime validate it, and immediately play the prototype in the studio demo.

The first version focuses on cinematic scene flow, dialogue, narration, choices, inventory/evidence, endings, and declarative gameplay hook zones. Gameplay hooks are polished placeholders where future modules can mount procedure interactions, evidence presentation, inspection scenes, puzzles, or object manipulation sequences.

## What It Solves

Narrative game prototypes often mix story data, branching logic, rendering, and one-off UI code. AdventureKit separates those concerns:

- `packages/core` validates game files and runs deterministic scene flow.
- `packages/react-runtime` renders a playable cinematic prototype.
- `packages/phaser-bridge` defines a placeholder adapter shape for future gameplay modules.
- `content/*/game.json` contains agent-authored playable games.
- `apps/studio-demo` loads content files automatically and previews device layouts.

## Why It Is Agent-Friendly

Agents can create a new prototype by writing one JSON file under `content/<prototype-name>/game.json`. The runtime code does not need to change. Validation reports source paths, schema issues, missing scene targets, missing ending targets, duplicate ids, and invalid item references.

## Install And Run

```bash
npm install
npm run dev
```

The demo starts from `apps/studio-demo` and loads all valid files matching `content/*/game.json`.

Useful checks:

```bash
npm test
npm run typecheck
npm run build
```

## Demo Prototypes

The studio includes three complete playable examples:

- `Code Blue: Midnight Shift`: procedure drama with urgent branching and two procedure hooks.
- `The Last Testimony`: investigation/courtroom flow with evidence and contradiction presentation.
- `The Clocktower Riddle`: puzzle adventure with item discovery and a clockwork puzzle hook.

## Create A New Game File

Create a folder and add `game.json`:

```text
content/my-prototype/game.json
```

The file needs metadata, a `startScene`, scenes, endings, and optional variables/items. A minimal scene contains `id`, `title`, `background`, `mood`, `blocks`, and optional `choices`.

```json
{
  "metadata": {
    "id": "my-prototype",
    "title": "My Prototype",
    "genre": "mystery",
    "author": "AdventureKit",
    "summary": "A short playable prototype."
  },
  "startScene": "start",
  "variables": {},
  "items": [],
  "scenes": [
    {
      "id": "start",
      "title": "Start",
      "background": "A quiet room.",
      "mood": ["curious"],
      "blocks": [{ "type": "narration", "text": "The story begins." }],
      "choices": [
        {
          "id": "finish",
          "label": "Finish",
          "target": { "type": "ending", "id": "complete" }
        }
      ]
    }
  ],
  "endings": [
    {
      "id": "complete",
      "title": "Complete",
      "tone": "resolved",
      "summary": "The prototype reaches an ending."
    }
  ]
}
```

## Schema

The Zod schema lives in `packages/core/src/schema.ts`. It supports:

- game metadata
- start scene
- scenes
- cinematic narration
- dialogue lines and speaker names
- scene background descriptors
- mood descriptors
- choices and conditional choices
- variables and variable updates
- inventory/evidence/items
- endings
- `gameplay_hook` blocks

More detail: `docs/schema.md`.

## Gameplay Hooks

A gameplay hook is a declarative mount point inside a scene. The React runtime displays it with hook id, hook type, intended future module, success target, failure target, design notes, and buttons to simulate success or failure.

Future gameplay modules should attach through the contract in `packages/phaser-bridge/src/index.ts`: receive the hook, current runtime state, a target element, and a `resolve("success" | "failure")` callback.

More detail: `docs/gameplay-hooks.md`.

## Preview Layouts

The studio demo includes preview controls for:

- mobile landscape
- mobile portrait
- tablet
- desktop

The primary layout is mobile landscape with a 16:9 cinematic stage. Portrait mode stacks the runtime and keeps controls touch-safe.

More detail: `docs/responsive-design.md`.

## Roadmap

- Add a CLI content validator.
- Add a richer gameplay module registry.
- Add optional Playwright responsive smoke tests.
- Add save/load snapshots for longer prototypes.
- Add authoring helpers that generate schema-safe scene graphs.
- Add real Phaser modules for procedure, puzzle, inspection, and evidence presentation hooks.
