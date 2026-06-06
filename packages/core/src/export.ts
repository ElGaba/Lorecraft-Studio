import type { AssetDefinition, CharacterDefinition, GameDefinition, GameplayHook, ItemDefinition, SceneDefinition } from "./types";

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

function chapterOutlineMarkdown(game: GameDefinition) {
  const outline = game.storyBible?.chapterOutline ?? game.scenes.map((scene) => scene.title);

  return `# ${game.metadata.title} Chapter Outline

## Story Beats
${list(outline)}

## Scene Flow
${game.scenes.map((scene, index) => `${index + 1}. ${scene.title} (${scene.id}) - ${scene.purpose ?? scene.synopsis ?? scene.background}`).join("\n")}

## Outcomes
${game.endings.map((ending) => `- ${ending.title} (${ending.id}): ${ending.summary}`).join("\n")}
`;
}

function gameplaySequences(game: GameDefinition) {
  return game.gameplayHooks.map((hook) => ({
    id: hook.id,
    type: hook.type,
    title: hook.title,
    module: hook.module,
    futureModuleType: hook.futureModuleType,
    narrativePurpose: hook.narrativePurpose,
    gameplayPurpose: hook.gameplayPurpose,
    expectedPlayerAction: hook.expectedPlayerAction,
    requiredInputs: hook.requiredInputs ?? [],
    successCondition: hook.successCondition,
    failureCondition: hook.failureCondition,
    successTarget: hook.successTarget,
    failureTarget: hook.failureTarget,
    successEffects: hook.successEffects ?? [],
    failureEffects: hook.failureEffects ?? [],
    uiLayoutNotes: hook.uiLayoutNotes,
    mobileGestureNotes: hook.mobileGestureNotes,
    implementationNotes: hook.implementationNotes,
    assetRequirements: hook.assetRequirements ?? [],
    agentPrompt: hook.agentPrompt,
    notes: hook.notes,
    linkedSceneIds: game.scenes
      .filter((scene) => scene.blocks.some((block) => block.type === "gameplay_hook" && (block.hookId === hook.id || block.hook?.id === hook.id)))
      .map((scene) => scene.id)
  }));
}

function animationPresets(game: GameDefinition) {
  const presets = new Map<string, Array<Record<string, string | number>>>();

  function addPreset(preset: string | undefined, source: Record<string, string | number>) {
    if (!preset) {
      return;
    }
    presets.set(preset, [...(presets.get(preset) ?? []), source]);
  }

  game.scenes.forEach((scene) => {
    scene.blocks.forEach((block, blockIndex) => {
      if (block.type === "dialogue" || block.type === "narration") {
        addPreset(block.animation, { type: "scene-block", sceneId: scene.id, blockIndex });
      }
    });
  });

  game.characters.forEach((character) => {
    character.variants.forEach((variant, variantIndex) => {
      addPreset(variant.animation, { type: "character-variant", characterId: character.id, variantIndex });
    });
  });

  return Array.from(presets.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([preset, sources]) => ({ preset, sources }));
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
  const evidence: ItemDefinition[] = game.items.filter((item) => item.kind === "evidence");

  return {
    projectId: game.metadata.id,
    generatedAt,
    files: {
      "game.json": json(pickGameShell(game)),
      "story-bible.md": storyBibleMarkdown(game),
      "chapter-outline.md": chapterOutlineMarkdown(game),
      "characters.json": json(characters),
      "scenes.json": json(scenes),
      "gameplay-hooks.json": json(hooks),
      "gameplay-sequences.json": json(gameplaySequences(game)),
      "assets.json": json(assets),
      "evidence.json": json(evidence),
      "variables.json": json(game.variables),
      "animation-presets.json": json(animationPresets(game)),
      "prompts.md": promptsMarkdown(game),
      "implementation-plan.md": implementationPlanMarkdown(game)
    }
  };
}
