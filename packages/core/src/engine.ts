import type {
  Choice,
  Condition,
  Effect,
  GameDefinition,
  GameplayHook,
  RuntimeState,
  SceneDefinition,
  Target,
  VariableValue
} from "./types";

function cloneVariables(variables: Record<string, VariableValue>) {
  return { ...variables };
}

function ownedInitialItems(game: GameDefinition) {
  return game.items.filter((item) => item.initiallyOwned).map((item) => item.id);
}

export function createInitialState(game: GameDefinition): RuntimeState {
  return {
    game,
    currentSceneId: game.startScene,
    variables: cloneVariables(game.variables),
    inventory: ownedInitialItems(game),
    history: []
  };
}

export function getCurrentScene(state: RuntimeState): SceneDefinition {
  const scene = state.game.scenes.find((candidate) => candidate.id === state.currentSceneId);
  if (!scene) {
    throw new Error(`Scene "${state.currentSceneId}" does not exist in ${state.game.metadata.title}.`);
  }
  return scene;
}

export function getCurrentEnding(state: RuntimeState) {
  if (!state.endingId) {
    return undefined;
  }
  return state.game.endings.find((ending) => ending.id === state.endingId);
}

function conditionMatches(state: RuntimeState, condition: Condition) {
  switch (condition.type) {
    case "hasItem":
      return state.inventory.includes(condition.itemId);
    case "notHasItem":
      return !state.inventory.includes(condition.itemId);
    case "variableEquals":
      return state.variables[condition.variable] === condition.value;
    case "variableNotEquals":
      return state.variables[condition.variable] !== condition.value;
    case "variableAtLeast": {
      const value = state.variables[condition.variable];
      return typeof value === "number" && value >= condition.value;
    }
    case "variableLessThan": {
      const value = state.variables[condition.variable];
      return typeof value === "number" && value < condition.value;
    }
  }
}

export function choiceIsAvailable(state: RuntimeState, choice: Choice) {
  return choice.conditions?.every((condition) => conditionMatches(state, condition)) ?? true;
}

export function getAvailableChoices(state: RuntimeState): Choice[] {
  if (state.endingId) {
    return [];
  }

  return (getCurrentScene(state).choices ?? []).filter((choice) => choiceIsAvailable(state, choice));
}

function applyEffect(state: RuntimeState, effect: Effect): RuntimeState {
  const variables = cloneVariables(state.variables);
  const inventory = new Set(state.inventory);

  switch (effect.type) {
    case "setVariable":
      variables[effect.variable] = effect.value;
      return { ...state, variables };
    case "incrementVariable": {
      const current = variables[effect.variable];
      variables[effect.variable] = (typeof current === "number" ? current : 0) + effect.by;
      return { ...state, variables };
    }
    case "addItem":
      inventory.add(effect.itemId);
      return { ...state, inventory: Array.from(inventory) };
    case "removeItem":
      inventory.delete(effect.itemId);
      return { ...state, inventory: Array.from(inventory) };
  }
}

function applyEffects(state: RuntimeState, effects: Effect[] | undefined) {
  return effects?.reduce((nextState, effect) => applyEffect(nextState, effect), state) ?? state;
}

function transitionToTarget(state: RuntimeState, target: Target): RuntimeState {
  if (target.type === "scene") {
    return {
      ...state,
      currentSceneId: target.id,
      endingId: undefined
    };
  }

  return {
    ...state,
    endingId: target.id
  };
}

export function choose(state: RuntimeState, choiceId: string): RuntimeState {
  const choice = getAvailableChoices(state).find((candidate) => candidate.id === choiceId);
  if (!choice) {
    throw new Error(`Choice "${choiceId}" is not available from scene "${state.currentSceneId}".`);
  }

  const fromSceneId = state.currentSceneId;
  const withEffects = applyEffects(state, choice.effects);
  const transitioned = transitionToTarget(withEffects, choice.target);

  return {
    ...transitioned,
    history: [
      ...state.history,
      {
        fromSceneId,
        toSceneId: choice.target.type === "scene" ? choice.target.id : undefined,
        endingId: choice.target.type === "ending" ? choice.target.id : undefined,
        actionId: choice.id,
        actionType: "choice"
      }
    ]
  };
}

function findGameplayHook(state: RuntimeState, hookId: string): GameplayHook {
  const scene = getCurrentScene(state);
  const hookBlock = scene.blocks.find((block) => block.type === "gameplay_hook" && (block.hook?.id === hookId || block.hookId === hookId));

  if (!hookBlock || hookBlock.type !== "gameplay_hook") {
    throw new Error(`Gameplay hook "${hookId}" is not available from scene "${state.currentSceneId}".`);
  }

  if (hookBlock.hook) {
    return hookBlock.hook;
  }

  const hook = state.game.gameplayHooks.find((candidate) => candidate.id === hookBlock.hookId);
  if (!hook) {
    throw new Error(`Gameplay hook "${hookId}" does not exist in ${state.game.metadata.title}.`);
  }

  return hook;
}

export function getSceneGameplayHooks(scene: SceneDefinition, game?: GameDefinition): GameplayHook[] {
  return scene.blocks
    .filter((block) => block.type === "gameplay_hook")
    .map((block) => {
      if (block.hook) {
        return block.hook;
      }
      return game?.gameplayHooks.find((hook) => hook.id === block.hookId);
    })
    .filter((hook): hook is GameplayHook => Boolean(hook));
}

export function resolveGameplayHook(
  state: RuntimeState,
  hookId: string,
  outcome: "success" | "failure"
): RuntimeState {
  const hook = findGameplayHook(state, hookId);
  const fromSceneId = state.currentSceneId;
  const effects = outcome === "success" ? hook.successEffects : hook.failureEffects;
  const target = outcome === "success" ? hook.successTarget : hook.failureTarget;
  const withEffects = applyEffects(state, effects);
  const transitioned = transitionToTarget(withEffects, target);

  return {
    ...transitioned,
    history: [
      ...state.history,
      {
        fromSceneId,
        toSceneId: target.type === "scene" ? target.id : undefined,
        endingId: target.type === "ending" ? target.id : undefined,
        actionId: hook.id,
        actionType: "gameplay_hook",
        outcome
      }
    ]
  };
}
