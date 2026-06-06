import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  choose,
  createExportPackage,
  createInitialState,
  getAvailableChoices,
  getCurrentScene,
  resolveGameplayHook,
  validateGame
} from "./index";
import type { GameDefinition, GameplayHookBlock } from "./index";

const contentRoot = join(process.cwd(), "content");

function loadContentGames() {
  return readdirSync(contentRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(contentRoot, entry.name, "game.json"))
    .map((filePath) => ({
      filePath,
      data: JSON.parse(readFileSync(filePath, "utf8")) as GameDefinition
    }));
}

function collectHookBlocks(game: GameDefinition) {
  return game.scenes.flatMap((scene) =>
    scene.blocks.filter((block): block is GameplayHookBlock => block.type === "gameplay_hook")
  );
}

function hookFromBlock(game: GameDefinition, block: GameplayHookBlock) {
  return block.hook ?? game.gameplayHooks.find((hook) => hook.id === block.hookId);
}

function countChoicesWithVariableEffects(game: GameDefinition) {
  return game.scenes
    .flatMap((scene) => scene.choices ?? [])
    .filter((choice) => choice.effects?.some((effect) => effect.type === "setVariable" || effect.type === "incrementVariable"))
    .length;
}

function parsedGameById(id: string) {
  const gameFile = loadContentGames().find(({ data }) => data.metadata.id === id);
  if (!gameFile) {
    throw new Error(`Missing content game "${id}".`);
  }

  const parsed = validateGame(gameFile.data, gameFile.filePath);
  if (!parsed.ok) {
    throw new Error(parsed.errors.map((error) => error.message).join("\n"));
  }

  return parsed.game;
}

describe("demo content library", () => {
  it("contains exactly the three requested playable prototype examples", () => {
    const games = loadContentGames();

    expect(games.map(({ data }) => data.metadata.id).sort()).toEqual([
      "code-blue-midnight-shift",
      "the-clocktower-riddle",
      "the-last-testimony"
    ]);
  });

  it("validates every content game with clear cross-reference checks", () => {
    const results = loadContentGames().map(({ data, filePath }) => validateGame(data, filePath));

    expect(results.every((result) => result.ok)).toBe(true);
  });

  it("lets every demo prototype move from start through choices or gameplay hooks toward an ending", () => {
    for (const { data, filePath } of loadContentGames()) {
      const parsed = validateGame(data, filePath);
      if (!parsed.ok) {
        throw new Error(parsed.errors.map((error) => error.message).join("\n"));
      }

      const state = createInitialState(parsed.game);
      const scene = getCurrentScene(state);
      const availableChoices = getAvailableChoices(state);
      const hookBlocks = collectHookBlocks(parsed.game);

      expect(scene.id).toBe(parsed.game.startScene);
      expect(availableChoices.length + hookBlocks.length).toBeGreaterThan(0);
      expect(parsed.game.endings.length).toBeGreaterThanOrEqual(1);
      expect(hookBlocks.length).toBeGreaterThanOrEqual(1);

      const hook = hookFromBlock(parsed.game, hookBlocks[0]);
      if (!hook) {
        throw new Error(`Expected first hook block in ${parsed.game.metadata.id} to resolve to a gameplay hook.`);
      }
      const sceneWithHook = parsed.game.scenes.find((candidate) =>
        candidate.blocks.some((block) => block.type === "gameplay_hook" && (block.hook?.id === hook.id || block.hookId === hook.id))
      );
      if (!sceneWithHook) {
        throw new Error(`Expected hook ${hook.id} to belong to a scene.`);
      }

      const hookState = { ...state, currentSceneId: sceneWithHook.id };
      expect(resolveGameplayHook(hookState, hook.id, "success")).toBeDefined();
      expect(resolveGameplayHook(hookState, hook.id, "failure")).toBeDefined();
    }
  });

  it("plays each prototype through a representative route from start to ending", () => {
    const codeBlue = parsedGameById("code-blue-midnight-shift");
    let codeBlueState = createInitialState(codeBlue);
    codeBlueState = choose(codeBlueState, "lead-monitor-first");
    codeBlueState = resolveGameplayHook(codeBlueState, "rapid-assessment", "success");
    codeBlueState = resolveGameplayHook(codeBlueState, "med-reconciliation", "success");
    codeBlueState = choose(codeBlueState, "complete-safe-transfer");
    expect(codeBlueState.endingId).toBe("safe-transfer");

    const testimony = parsedGameById("the-last-testimony");
    let testimonyState = createInitialState(testimony);
    testimonyState = choose(testimonyState, "inspect-basement-log");
    testimonyState = choose(testimonyState, "enter-court-with-keycard");
    testimonyState = resolveGameplayHook(testimonyState, "present-contradiction", "success");
    testimonyState = choose(testimonyState, "deliver-final-testimony");
    expect(testimonyState.endingId).toBe("timeline-revealed");

    const clocktower = parsedGameById("the-clocktower-riddle");
    let clocktowerState = createInitialState(clocktower);
    clocktowerState = choose(clocktowerState, "search-fountain");
    clocktowerState = choose(clocktowerState, "map-the-tower");
    clocktowerState = choose(clocktowerState, "take-blue-lantern");
    clocktowerState = resolveGameplayHook(clocktowerState, "align-bells", "success");
    clocktowerState = choose(clocktowerState, "restore-clock");
    expect(clocktowerState.endingId).toBe("tower-restored");
  });

  it("routes The Last Testimony through chain-of-custody proof before closing", () => {
    const testimony = parsedGameById("the-last-testimony");
    let testimonyState = createInitialState(testimony);

    testimonyState = choose(testimonyState, "inspect-basement-log");
    testimonyState = choose(testimonyState, "enter-court-with-keycard");
    testimonyState = resolveGameplayHook(testimonyState, "present-contradiction", "success");
    testimonyState = choose(testimonyState, "reveal-window");
    testimonyState = resolveGameplayHook(testimonyState, "inspect_crime_scene_photo_detail", "success");
    testimonyState = choose(testimonyState, "build-closing");
    expect(testimonyState.currentSceneId).toBe("photo_envelope_chain");

    testimonyState = choose(testimonyState, "log-envelope-seal");
    expect(testimonyState.currentSceneId).toBe("closing-argument");
    expect(testimonyState.inventory).toContain("photo-envelope-chain");
    expect(testimonyState.inventory).toContain("witness-script-fragment");
    expect(testimonyState.variables.chainOfCustody).toBe(1);

    testimonyState = choose(testimonyState, "complete-revealed-timeline");
    expect(testimonyState.endingId).toBe("timeline-revealed");
  });

  it("upgrades every prototype into a rich studio project vertical slice", () => {
    const requirements = {
      "code-blue-midnight-shift": { scenes: 12, characters: 6, hooks: 8, endings: 3 },
      "the-last-testimony": { scenes: 14, characters: 6, hooks: 8, endings: 3 },
      "the-clocktower-riddle": { scenes: 12, characters: 5, hooks: 8, endings: 3 }
    };

    for (const { data } of loadContentGames()) {
      const requirement = requirements[data.metadata.id as keyof typeof requirements];
      expect(requirement).toBeDefined();
      expect(data.storyBible?.premise.length).toBeGreaterThan(20);
      expect(data.characters?.length).toBeGreaterThanOrEqual(requirement.characters);
      expect(data.scenes.length).toBeGreaterThanOrEqual(requirement.scenes);
      expect(data.gameplayHooks?.length).toBeGreaterThanOrEqual(requirement.hooks);
      expect(data.assets?.filter((asset) => asset.type === "background").length).toBeGreaterThanOrEqual(6);
      expect(data.endings.length).toBeGreaterThanOrEqual(requirement.endings);
      expect(data.scenes.every((scene) => scene.layoutNotes?.mobileLandscape && scene.backgroundPrompt)).toBe(true);
      expect(data.characters?.every((character) => character.variants.length > 0)).toBe(true);
    }
  });

  it("makes The Last Testimony the flagship Chapter 1 content floor", () => {
    const testimony = parsedGameById("the-last-testimony");

    expect(testimony.scenes.length).toBeGreaterThanOrEqual(18);
    expect(testimony.characters.length).toBeGreaterThanOrEqual(7);
    expect(testimony.items.filter((item) => item.kind === "evidence").length).toBeGreaterThanOrEqual(10);
    expect(testimony.gameplayHooks.length).toBeGreaterThanOrEqual(8);
    expect(countChoicesWithVariableEffects(testimony)).toBeGreaterThanOrEqual(4);
    expect(testimony.endings.length).toBeGreaterThanOrEqual(3);
  });

  it("exports The Last Testimony as a Chapter 1 production handoff package", () => {
    const testimony = parsedGameById("the-last-testimony");
    const exported = createExportPackage(testimony, "2026-06-06T00:00:00.000Z");
    const evidence = JSON.parse(exported.files["evidence.json"]);
    const variables = JSON.parse(exported.files["variables.json"]);
    const sequences = JSON.parse(exported.files["gameplay-sequences.json"]);
    const animations = JSON.parse(exported.files["animation-presets.json"]);

    expect(exported.files["chapter-outline.md"]).toContain("Chain of custody challenge");
    expect(evidence).toHaveLength(10);
    expect(evidence.map((item: { id: string }) => item.id)).toContain("photo-envelope-chain");
    expect(variables).toHaveProperty("chainOfCustody", 0);
    expect(sequences.map((sequence: { id: string }) => sequence.id)).toContain("inspect_crime_scene_photo_detail");
    expect(sequences.find((sequence: { id: string }) => sequence.id === "closing-argument-build")).toMatchObject({
      type: "custom",
      linkedSceneIds: ["closing-argument"]
    });
    expect(animations.map((animation: { preset: string }) => animation.preset)).toEqual(expect.arrayContaining(["evidence-slam", "tool-ready"]));
  });
});
