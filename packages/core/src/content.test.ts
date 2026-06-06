import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  choose,
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

      const hook = hookBlocks[0].hook;
      const sceneWithHook = parsed.game.scenes.find((candidate) =>
        candidate.blocks.some((block) => block.type === "gameplay_hook" && block.hook.id === hook.id)
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
});
