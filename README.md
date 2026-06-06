# AdventureKit

AdventureKit is an open-source TypeScript toolkit for building cinematic narrative and adventure game prototypes that run on mobile web, tablet, and desktop. It now includes AdventureKit Studio: a local, mobile-first authoring surface for scenes, characters, asset prompts, story bibles, gameplay hook specs, export packages, and playable previews.

The first version focuses on cinematic scene flow, dialogue, narration, choices, inventory/evidence, endings, and declarative gameplay hook zones. Gameplay hooks are polished placeholders where future modules can mount procedure interactions, evidence presentation, inspection scenes, puzzles, or object manipulation sequences.

## What It Solves

Narrative game prototypes often mix story data, branching logic, rendering, and one-off UI code. AdventureKit separates those concerns:

- `packages/core` validates rich Studio game files, exports production packages, and runs deterministic scene flow.
- `packages/react-runtime` renders a playable cinematic prototype with portraits, evidence, hook panels, animation presets, and endings.
- `packages/phaser-bridge` defines a placeholder adapter shape for future gameplay modules.
- `content/*/game.json` contains agent-authored playable games.
- `apps/studio-demo` loads content files automatically and provides Studio and Play modes.

## Why It Is Agent-Friendly

Agents can create a new prototype by writing one JSON file under `content/<prototype-name>/game.json`. The runtime code does not need to change. Validation reports source paths, schema issues, missing scene targets, missing ending targets, duplicate ids, invalid character/asset/hook references, missing Studio prompts, and missing mobile layout notes.

## Install And Run

```bash
npm install
npm run dev
```

The demo starts from `apps/studio-demo` and loads all valid files matching `content/*/game.json`. The first screen opens in Studio mode. Use Play mode to run the selected project.

Useful checks:

```bash
npm test
npm run typecheck
npm run build
npm run smoke
```

## Demo Prototypes

The studio includes three rich vertical slices:

- `Code Blue: Midnight Shift`: emergency thriller with 6 characters, 13 scenes, 8 hook specs, asset prompts, and 4 outcomes.
- `The Last Testimony`: courtroom mystery with 6 characters, 17 scenes, 8 hook specs, evidence assets, and 3 outcomes.
- `The Clocktower Riddle`: puzzle adventure with 5 characters, 12 scenes, 8 hook specs, item assets, and 3 outcomes.

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

## Studio Features

Studio mode includes:

- project dashboard and prototype selector
- scene editor with local-agent buttons and validation
- character editor with emotions, stances, and variants
- asset prompt manager for backgrounds, portraits, CG, overlays, evidence, and hook concepts
- story bible editor
- gameplay hook manager
- responsive preview modes
- export package viewer
- local agent bridge fallback prompt modal

## Schema

The Zod schema lives in `packages/core/src/schema.ts`. It supports:

- game metadata
- start scene
- scenes
- cinematic narration
- dialogue lines, character ids, emotion, stance, and position
- scene background descriptors
- background prompts and layout notes
- mood descriptors
- choices and conditional choices
- variables and variable updates
- inventory/evidence/items
- story bible, characters, assets, and top-level gameplay hooks
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

More detail: `docs/responsive-design.md` and `docs/mobile-first-design.md`.

## Documentation

- `docs/studio.md`
- `docs/agent-bridge.md`
- `docs/asset-pipeline.md`
- `docs/character-system.md`
- `docs/animation-system.md`
- `docs/gameplay-hooks.md`
- `docs/mobile-first-design.md`
- `docs/export-format.md`

## Roadmap

- Add a CLI content validator.
- Add a richer gameplay module registry.
- Add save/load snapshots for longer prototypes.
- Add real Phaser modules for procedure, puzzle, inspection, and evidence presentation hooks.
