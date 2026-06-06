import type { AssetDefinition, CharacterDefinition, GameDefinition, GameplayHook, SceneDefinition } from "./types";

export interface ExportPackage {
  projectId: string;
  generatedAt: string;
  files: Record<string, string>;
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function list(items: string[] | undefined) {
  return items && items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None";
}

function storyBibleMarkdown(game: GameDefinition) {
  const bible = game.storyBible;
  if (!bible) {
    return `# ${game.metadata.title} Story Bible\n\nNo story bible has been authored yet.\n`;
  }

  return `# ${game.metadata.title} Story Bible

## Premise
${bible.premise}

## Genre And Tone
- Genre: ${bible.genre}
- Tone: ${bible.tone}
- Target platform: ${bible.targetPlatform}
- Play style: ${bible.targetPlayStyle}

## Visual Direction
${bible.visualDirection}

## Pacing Rules
${list(bible.pacingRules)}

## World Rules
${list(bible.worldRules)}

## Main Cast
${list(bible.mainCast)}

## Key Locations
${list(bible.keyLocations)}

## Core Mystery Or Conflict
${bible.coreMystery}

## Chapter Outline
${list(bible.chapterOutline)}

## Writing Style Guide
${bible.writingStyleGuide}

## Content Boundaries
${list(bible.contentBoundaries)}

## Gameplay Module Plan
${list(bible.gameplayModulePlan)}
`;
}

function promptsMarkdown(game: GameDefinition) {
  const scenePrompts = game.scenes
    .filter((scene) => scene.backgroundPrompt)
    .map((scene) => `## Scene: ${scene.title}\n\nAsset: ${scene.id}\n\n${scene.backgroundPrompt}`)
    .join("\n\n");
  const assetPrompts = game.assets
    .map((asset) => `## Asset: ${asset.id}\n\nType: ${asset.type}\n\n${asset.prompt}\n\nNegative: ${asset.negativePrompt ?? "None"}`)
    .join("\n\n");
  const characterPrompts = game.characters
    .map((character) => `## Character: ${character.displayName}\n\n${character.baseImagePrompt}\n\n${character.variants.map((variant) => `- ${variant.emotionId}/${variant.stanceId}: ${variant.imagePrompt}`).join("\n")}`)
    .join("\n\n");

  return `# ${game.metadata.title} Prompt Book

${scenePrompts}

${assetPrompts}

${characterPrompts}
`;
}

function implementationPlanMarkdown(game: GameDefinition) {
  return `# ${game.metadata.title} Implementation Plan

## Runtime
- Validate structured content with AdventureKit core.
- Render scenes through the React runtime.
- Keep story state in serializable variables and inventory.

## Gameplay Modules
${game.gameplayHooks.map((hook) => `- ${hook.id}: ${hook.futureModuleType ?? hook.type} - ${hook.implementationNotes ?? hook.notes}`).join("\n")}

## Assets
${game.assets.map((asset) => `- ${asset.id}: ${asset.status} - ${asset.targetDeviceUsage}`).join("\n")}
`;
}

function pickGameShell(game: GameDefinition) {
  const { storyBible, characters, assets, gameplayHooks, scenes, ...shell } = game;
  return shell;
}

export function createExportPackage(game: GameDefinition, generatedAt = new Date().toISOString()): ExportPackage {
  const characters: CharacterDefinition[] = game.characters;
  const assets: AssetDefinition[] = game.assets;
  const hooks: GameplayHook[] = game.gameplayHooks;
  const scenes: SceneDefinition[] = game.scenes;

  return {
    projectId: game.metadata.id,
    generatedAt,
    files: {
      "game.json": json(pickGameShell(game)),
      "story-bible.md": storyBibleMarkdown(game),
      "characters.json": json(characters),
      "scenes.json": json(scenes),
      "gameplay-hooks.json": json(hooks),
      "assets.json": json(assets),
      "prompts.md": promptsMarkdown(game),
      "implementation-plan.md": implementationPlanMarkdown(game)
    }
  };
}
