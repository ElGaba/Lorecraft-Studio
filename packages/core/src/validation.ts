import { gameSchema } from "./schema";
import type { Effect, GameDefinition, GameplayHook, Target, ValidationError, ValidationResult } from "./types";

function pathToString(path: Array<string | number>) {
  return path.reduce<string>((formatted, segment) => {
    if (typeof segment === "number") {
      return `${formatted}[${segment}]`;
    }
    return formatted ? `${formatted}.${segment}` : segment;
  }, "");
}

function error(source: string, path: string, message: string): ValidationError {
  return { source, path, message };
}

function ensureUniqueIds(source: string, collectionName: string, ids: string[]) {
  const seen = new Set<string>();
  const errors: ValidationError[] = [];

  ids.forEach((id, index) => {
    if (seen.has(id)) {
      errors.push(error(source, `${collectionName}[${index}].id`, `Duplicate id "${id}".`));
      return;
    }
    seen.add(id);
  });

  return errors;
}

function targetExists(target: Target, sceneIds: Set<string>, endingIds: Set<string>) {
  return target.type === "scene" ? sceneIds.has(target.id) : endingIds.has(target.id);
}

function validateTarget(
  source: string,
  path: string,
  target: Target,
  sceneIds: Set<string>,
  endingIds: Set<string>
) {
  if (targetExists(target, sceneIds, endingIds)) {
    return [];
  }

  const collection = target.type === "scene" ? "scene" : "ending";
  return [error(source, path, `Target ${collection} "${target.id}" does not exist.`)];
}

function validateEffect(source: string, path: string, effect: Effect, itemIds: Set<string>) {
  if ((effect.type === "addItem" || effect.type === "removeItem") && !itemIds.has(effect.itemId)) {
    return [error(source, `${path}.itemId`, `Item "${effect.itemId}" does not exist.`)];
  }
  return [];
}

function validateHookTargets(
  source: string,
  path: string,
  hook: GameplayHook,
  sceneIds: Set<string>,
  endingIds: Set<string>,
  assetIds: Set<string>,
  itemIds: Set<string>
) {
  const errors: ValidationError[] = [];

  errors.push(
    ...validateTarget(source, `${path}.successTarget.id`, hook.successTarget, sceneIds, endingIds),
    ...validateTarget(source, `${path}.failureTarget.id`, hook.failureTarget, sceneIds, endingIds)
  );

  hook.assetRequirements?.forEach((assetId, assetIndex) => {
    if (!assetIds.has(assetId)) {
      errors.push(error(source, `${path}.assetRequirements[${assetIndex}]`, `Asset "${assetId}" does not exist.`));
    }
  });

  hook.successEffects?.forEach((effect, effectIndex) => {
    errors.push(...validateEffect(source, `${path}.successEffects[${effectIndex}]`, effect, itemIds));
  });

  hook.failureEffects?.forEach((effect, effectIndex) => {
    errors.push(...validateEffect(source, `${path}.failureEffects[${effectIndex}]`, effect, itemIds));
  });

  return errors;
}

function crossValidate(game: GameDefinition, source: string) {
  const errors: ValidationError[] = [];
  const sceneIds = new Set(game.scenes.map((scene) => scene.id));
  const endingIds = new Set(game.endings.map((ending) => ending.id));
  const itemIds = new Set(game.items.map((item) => item.id));
  const characterIds = new Set(game.characters.map((character) => character.id));
  const assetIds = new Set(game.assets.map((asset) => asset.id));
  const topLevelHookIds = new Set(game.gameplayHooks.map((hook) => hook.id));
  const hookIds = new Set<string>();
  const isStudioProject = Boolean(game.storyBible || game.characters.length > 0 || game.assets.length > 0 || game.gameplayHooks.length > 0);

  errors.push(...ensureUniqueIds(source, "scenes", game.scenes.map((scene) => scene.id)));
  errors.push(...ensureUniqueIds(source, "endings", game.endings.map((ending) => ending.id)));
  errors.push(...ensureUniqueIds(source, "items", game.items.map((item) => item.id)));
  errors.push(...ensureUniqueIds(source, "characters", game.characters.map((character) => character.id)));
  errors.push(...ensureUniqueIds(source, "assets", game.assets.map((asset) => asset.id)));
  errors.push(...ensureUniqueIds(source, "gameplayHooks", game.gameplayHooks.map((hook) => hook.id)));

  if (!sceneIds.has(game.startScene)) {
    errors.push(error(source, "startScene", `Start scene "${game.startScene}" does not exist.`));
  }

  game.storyBible?.mainCast.forEach((characterId, characterIndex) => {
    if (!characterIds.has(characterId)) {
      errors.push(error(source, `storyBible.mainCast[${characterIndex}]`, `Character "${characterId}" does not exist.`));
    }
  });

  game.assets.forEach((asset, assetIndex) => {
    asset.linkedSceneIds?.forEach((sceneId, sceneIndex) => {
      if (!sceneIds.has(sceneId)) {
        errors.push(error(source, `assets[${assetIndex}].linkedSceneIds[${sceneIndex}]`, `Scene "${sceneId}" does not exist.`));
      }
    });

    asset.linkedCharacterIds?.forEach((characterId, characterIndex) => {
      if (!characterIds.has(characterId)) {
        errors.push(error(source, `assets[${assetIndex}].linkedCharacterIds[${characterIndex}]`, `Character "${characterId}" does not exist.`));
      }
    });
  });

  game.items.forEach((item, itemIndex) => {
    if (item.imageAssetId && !assetIds.has(item.imageAssetId)) {
      errors.push(error(source, `items[${itemIndex}].imageAssetId`, `Asset "${item.imageAssetId}" does not exist.`));
    }
  });

  game.gameplayHooks.forEach((hook, hookIndex) => {
    const hookPath = `gameplayHooks[${hookIndex}]`;
    errors.push(...validateHookTargets(source, hookPath, hook, sceneIds, endingIds, assetIds, itemIds));

    if (isStudioProject) {
      if (!hook.uiLayoutNotes) {
        errors.push(error(source, `${hookPath}.uiLayoutNotes`, `Gameplay hook "${hook.id}" is missing UI layout notes.`));
      }

      if (!hook.agentPrompt) {
        errors.push(error(source, `${hookPath}.agentPrompt`, `Gameplay hook "${hook.id}" is missing an agent prompt.`));
      }
    }
  });

  game.scenes.forEach((scene, sceneIndex) => {
    if (isStudioProject) {
      if (!scene.layoutNotes?.mobileLandscape) {
        errors.push(error(source, `scenes[${sceneIndex}].layoutNotes.mobileLandscape`, `Scene "${scene.id}" is missing mobile landscape layout notes.`));
      }

      if (!scene.backgroundPrompt) {
        errors.push(error(source, `scenes[${sceneIndex}].backgroundPrompt`, `Scene "${scene.id}" is missing a background image prompt.`));
      }
    }

    scene.assetIds?.forEach((assetId, assetIndex) => {
      if (!assetIds.has(assetId)) {
        errors.push(error(source, `scenes[${sceneIndex}].assetIds[${assetIndex}]`, `Asset "${assetId}" does not exist.`));
      }
    });

    scene.choices?.forEach((choice, choiceIndex) => {
      const choicePath = `scenes[${sceneIndex}].choices[${choiceIndex}]`;
      errors.push(
        ...validateTarget(source, `${choicePath}.target.id`, choice.target, sceneIds, endingIds)
      );

      choice.conditions?.forEach((condition, conditionIndex) => {
        if ((condition.type === "hasItem" || condition.type === "notHasItem") && !itemIds.has(condition.itemId)) {
          errors.push(
            error(source, `${choicePath}.conditions[${conditionIndex}].itemId`, `Item "${condition.itemId}" does not exist.`)
          );
        }
      });

      choice.effects?.forEach((effect, effectIndex) => {
        errors.push(...validateEffect(source, `${choicePath}.effects[${effectIndex}]`, effect, itemIds));
      });
    });

    scene.blocks.forEach((block, blockIndex) => {
      if (block.type === "dialogue" && block.characterId && !characterIds.has(block.characterId)) {
        errors.push(error(source, `scenes[${sceneIndex}].blocks[${blockIndex}].characterId`, `Character "${block.characterId}" does not exist.`));
      }

      if (block.type !== "gameplay_hook") {
        return;
      }

      const hookPath = `scenes[${sceneIndex}].blocks[${blockIndex}].hook`;

      if (block.hookId && !topLevelHookIds.has(block.hookId)) {
        errors.push(error(source, `scenes[${sceneIndex}].blocks[${blockIndex}].hookId`, `Gameplay hook "${block.hookId}" does not exist.`));
      }

      if (!block.hook) {
        return;
      }

      if (hookIds.has(block.hook.id)) {
        errors.push(error(source, `${hookPath}.id`, `Duplicate inline gameplay hook id "${block.hook.id}".`));
      }
      hookIds.add(block.hook.id);

      errors.push(...validateHookTargets(source, hookPath, block.hook, sceneIds, endingIds, assetIds, itemIds));
    });
  });

  return errors;
}

export function validateGame(input: unknown, source = "game"): ValidationResult {
  const parsed = gameSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      source,
      errors: parsed.error.issues.map((issue) =>
        error(source, pathToString(issue.path), issue.message)
      )
    };
  }

  const errors = crossValidate(parsed.data, source);
  if (errors.length > 0) {
    return {
      ok: false,
      source,
      errors
    };
  }

  return {
    ok: true,
    source,
    game: parsed.data
  };
}

export function formatValidationErrors(errors: ValidationError[]) {
  return errors.map((validationError) => {
    const path = validationError.path ? `${validationError.path}: ` : "";
    return `${validationError.source} ${path}${validationError.message}`;
  }).join("\n");
}
