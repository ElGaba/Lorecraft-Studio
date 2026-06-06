import { gameSchema } from "./schema";
import type { Effect, GameDefinition, Target, ValidationError, ValidationResult } from "./types";

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

function crossValidate(game: GameDefinition, source: string) {
  const errors: ValidationError[] = [];
  const sceneIds = new Set(game.scenes.map((scene) => scene.id));
  const endingIds = new Set(game.endings.map((ending) => ending.id));
  const itemIds = new Set(game.items.map((item) => item.id));
  const hookIds = new Set<string>();

  errors.push(...ensureUniqueIds(source, "scenes", game.scenes.map((scene) => scene.id)));
  errors.push(...ensureUniqueIds(source, "endings", game.endings.map((ending) => ending.id)));
  errors.push(...ensureUniqueIds(source, "items", game.items.map((item) => item.id)));

  if (!sceneIds.has(game.startScene)) {
    errors.push(error(source, "startScene", `Start scene "${game.startScene}" does not exist.`));
  }

  game.scenes.forEach((scene, sceneIndex) => {
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
      if (block.type !== "gameplay_hook") {
        return;
      }

      const hookPath = `scenes[${sceneIndex}].blocks[${blockIndex}].hook`;
      if (hookIds.has(block.hook.id)) {
        errors.push(error(source, `${hookPath}.id`, `Duplicate gameplay hook id "${block.hook.id}".`));
      }
      hookIds.add(block.hook.id);

      errors.push(
        ...validateTarget(source, `${hookPath}.successTarget.id`, block.hook.successTarget, sceneIds, endingIds),
        ...validateTarget(source, `${hookPath}.failureTarget.id`, block.hook.failureTarget, sceneIds, endingIds)
      );

      block.hook.successEffects?.forEach((effect, effectIndex) => {
        errors.push(...validateEffect(source, `${hookPath}.successEffects[${effectIndex}]`, effect, itemIds));
      });

      block.hook.failureEffects?.forEach((effect, effectIndex) => {
        errors.push(...validateEffect(source, `${hookPath}.failureEffects[${effectIndex}]`, effect, itemIds));
      });
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
