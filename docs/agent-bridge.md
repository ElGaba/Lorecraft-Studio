# Local Agent Bridge

AdventureKit Studio includes a local agent bridge abstraction in `apps/studio-demo/src/agentBridge.ts`.

## Settings

- Endpoint URL: optional local HTTP endpoint.
- Provider Label: displayed in the fallback prompt modal.
- Apply Mode: `review` or `auto-apply`.

No endpoint is required. When the endpoint is blank or unreachable, Studio opens a copyable prompt modal.

## Actions

- `improve_scene`
- `generate_background_prompt`
- `generate_character_sheet`
- `generate_dialogue`
- `expand_story_branch`
- `generate_gameplay_hook_spec`
- `cinematic_polish_pass`

## Request Shape

Studio posts JSON to the endpoint:

```json
{
  "action": "improve_scene",
  "providerLabel": "Local agent",
  "applyMode": "review",
  "prompt": "Action: improve_scene..."
}
```

The prompt includes the selected project, story bible summary, scene, character, and gameplay hook context. Endpoint responses are shown for review; source files are not modified by the browser.
