# Character System

Characters are first-class Studio records used by scene dialogue, portrait placeholders, and asset prompts.

## Character Record

Each character includes id, display name, role, archetype, biography, traits, secrets, motivations, visual description, base image prompt, emotions, stances, screen positions, voice notes, relationship notes, and variants.

## Variants

Variants combine:

- `emotionId`
- `stanceId`
- `description`
- `imagePrompt`
- `animation`
- `usageNotes`

The runtime renders a portrait card placeholder using the character display name and dialogue performance metadata. Future art passes can replace placeholders with generated portraits and stance variants.

## Dialogue Fields

Dialogue blocks can include `characterId`, `emotion`, `stance`, `position`, and `animation`. Validation catches broken `characterId` references.
