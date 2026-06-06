# Lorecraft Studio

Lorecraft Studio is an agent-friendly creative studio for writing, staging, previewing, and exporting cinematic interactive game stories. It is focused on story bibles, scenes, characters, dialogue, branching narrative, character emotions and stances, scene staging, asset prompts, lightweight animations, gameplay sequence specs, and playable preview.

The current flagship project is **The Last Testimony**, a noir courtroom mystery being upgraded into a polished Chapter 1 vertical slice. The older package names still use `@adventurekit/*` for compatibility while the user-facing product transitions to Lorecraft Studio.

## What Lorecraft Studio Is

Lorecraft Studio is not positioned primarily as a game engine. It is a local creative production surface for interactive narrative teams and agents. Future systems such as music, image generation, advanced gameplay modules, native/mobile packaging, and export targets are treated as addons.

The workspace currently includes:

- `apps/studio-demo`: the Lorecraft Studio app.
- `packages/core`: schema validation, deterministic story flow, and export package generation.
- `packages/react-runtime`: cinematic mobile-first playable runtime.
- `packages/phaser-bridge`: compatibility placeholder for future gameplay modules.
- `content/the-last-testimony/game.json`: flagship Chapter 1 project data.
- `content/*/game.json`: secondary demo projects.

## Run The Studio

```bash
npm install
npm run dev
```

The app opens as Lorecraft Studio. The Last Testimony is selected first as the flagship project.

Useful checks:

```bash
npm test
npm run typecheck
npm run build
npm run smoke
```

## Launch Full-Screen Playthrough

From Studio mode, keep **The Last Testimony** selected and press **Play Chapter**. This opens a dedicated Chapter 1 playthrough shell that hides the editor UI and shows:

- chapter title
- current objective
- chapter progress
- local saved-progress status
- Court Record count
- Enter Fullscreen
- Restart Chapter
- Exit Playthrough

Progress is saved locally after the player advances beyond the opening state, so leaving and pressing **Play Chapter** again resumes the chapter. **Restart Chapter** clears that local save and returns to the opening scene. The playthrough is designed around mobile landscape first, with tablet and desktop support.

## The Last Testimony

**Genre:** investigation / courtroom mystery / noir legal thriller.

The Last Testimony currently contains the strongest story direction and is the main showcase. It includes 18 playable scenes, 7 characters, 10 evidence items, 8 gameplay hook sequences, variable-driven choices, and 3 outcomes. The current route covers courtroom VN scenes, image-backed backgrounds, character sprites, evidence selection, testimony navigation, Press Statement / HOLD IT beats, statement-aware evidence presentation, failure branches, chain-of-custody review, and an OBJECTION payoff.

The Chapter 1 target is a complete beginning, middle, climax, and chapter ending with:

- a cold open before dawn
- final testimony setup
- evidence review
- contradiction gameplay
- revelation sequence
- investigation or reconstruction sequence
- chain-of-custody proof
- pressure/interrogation sequence
- courtroom escalation
- major twist
- at least three outcomes

## Studio Areas

- Scene Editor: purpose, synopsis, camera, background, prompts, mood, assets, and mobile layout notes.
- Character Editor: role, visual description, base portrait prompt, emotions, stances, and variants.
- Asset Prompt Manager: prompts for backgrounds, portraits, CGs, overlays, evidence, and hook concepts.
- Story Bible: premise, tone, play style, visual direction, and writing rules.
- Gameplay Hook Manager: narrative purpose, expected player action, success/failure targets, and module notes.
- Export Package: generated production files for handoff.
- Responsive Preview: mobile landscape, mobile portrait, tablet, and desktop.

## Gameplay Sequences

The current runtime supports multiple playable courtroom modes:

- testimony statement cards
- statement navigation
- Press Statement feedback
- selectable Court Record evidence
- correct and incorrect presentation branches
- photo/document inspection prompts
- chain-of-custody proof routing
- animated impact moments

The next gameplay modules planned for The Last Testimony are pressure/interrogation, deeper inspection hinting, and reconstruction/timeline ordering.

## Asset Prompts

Characters, scenes, evidence, and cinematic overlays carry image prompts, negative prompts, aspect ratios, intended use, linked scenes/characters, and readiness status. The studio is prepared for image generation integration, but it does not call cloud image generation directly.

## Export

The export panel currently generates:

- `game.json`
- `story-bible.md`
- `chapter-outline.md`
- `characters.json`
- `scenes.json`
- `gameplay-hooks.json`
- `gameplay-sequences.json`
- `assets.json`
- `evidence.json`
- `variables.json`
- `animation-presets.json`
- `prompts.md`
- `implementation-plan.md`

## Documentation

- `docs/lorecraft-studio.md`
- `docs/fullscreen-playthrough.md`
- `docs/studio.md`
- `docs/agent-bridge.md`
- `docs/asset-pipeline.md`
- `docs/character-system.md`
- `docs/animation-system.md`
- `docs/gameplay-hooks.md`
- `docs/mobile-first-design.md`
- `docs/export-format.md`
- `docs/last-testimony-reference-playbook.md`

## Future Addons

- music studio
- image generation integration
- character art generation
- gameplay modules
- visual editor upgrades
- native/mobile packaging
- additional export targets
