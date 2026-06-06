import { describe, expect, it } from "vitest";
import {
  choose,
  createInitialState,
  getAvailableChoices,
  getCurrentScene,
  resolveGameplayHook,
  validateGame
} from "./index";
import type { GameDefinition } from "./index";

const flowGame: GameDefinition = {
  metadata: {
    id: "flow-game",
    title: "Flow Game",
    genre: "puzzle adventure",
    author: "AdventureKit",
    summary: "A deterministic engine test."
  },
  startScene: "entry",
  variables: {
    trust: 0
  },
  items: [
    {
      id: "key",
      name: "Clock Key",
      kind: "item",
      description: "A key used by conditional choices.",
      initiallyOwned: false
    }
  ],
  characters: [],
  assets: [],
  gameplayHooks: [],
  scenes: [
    {
      id: "entry",
      title: "Entry",
      background: "A corridor with one visible clue.",
      mood: ["curious"],
      blocks: [{ type: "narration", text: "The corridor waits." }],
      choices: [
        {
          id: "take-key",
          label: "Take the key",
          target: { type: "scene", id: "locked-door" },
          effects: [
            { type: "addItem", itemId: "key" },
            { type: "incrementVariable", variable: "trust", by: 1 }
          ]
        }
      ]
    },
    {
      id: "locked-door",
      title: "Locked Door",
      background: "A brass door beneath a violet exit sign.",
      mood: ["tense"],
      blocks: [
        {
          type: "gameplay_hook",
          hook: {
            id: "unlock-door",
            type: "object_manipulation",
            module: "future-lockpick-module",
            successTarget: { type: "scene", id: "beyond-door" },
            failureTarget: { type: "ending", id: "stuck" },
            notes: "A later module can replace this deterministic placeholder."
          }
        }
      ],
      choices: [
        {
          id: "use-key",
          label: "Use the key",
          target: { type: "scene", id: "beyond-door" },
          conditions: [{ type: "hasItem", itemId: "key" }]
        },
        {
          id: "hidden-without-trust",
          label: "Ask your partner to force the door",
          target: { type: "ending", id: "stuck" },
          conditions: [{ type: "variableAtLeast", variable: "trust", value: 2 }]
        }
      ]
    },
    {
      id: "beyond-door",
      title: "Beyond Door",
      background: "The solved path opens.",
      mood: ["relieved"],
      blocks: [{ type: "narration", text: "The path is clear." }],
      choices: [
        {
          id: "finish",
          label: "Finish",
          target: { type: "ending", id: "free" }
        }
      ]
    }
  ],
  endings: [
    {
      id: "free",
      title: "Free",
      tone: "hopeful",
      summary: "The player made it out."
    },
    {
      id: "stuck",
      title: "Stuck",
      tone: "somber",
      summary: "The path collapsed."
    }
  ]
};

function parsedFlowGame() {
  const parsed = validateGame(flowGame, "flow-game.json");
  if (!parsed.ok) {
    throw new Error(parsed.errors.map((error) => error.message).join("\n"));
  }
  return parsed.game;
}

describe("deterministic scene flow engine", () => {
  it("starts at the configured start scene with initial variables and inventory", () => {
    const state = createInitialState(parsedFlowGame());

    expect(state.currentSceneId).toBe("entry");
    expect(state.variables.trust).toBe(0);
    expect(state.inventory).toEqual([]);
    expect(getCurrentScene(state).title).toBe("Entry");
  });

  it("applies choice effects and only exposes choices whose conditions are met", () => {
    const state = createInitialState(parsedFlowGame());
    const afterChoice = choose(state, "take-key");

    expect(afterChoice.currentSceneId).toBe("locked-door");
    expect(afterChoice.variables.trust).toBe(1);
    expect(afterChoice.inventory).toEqual(["key"]);
    expect(getAvailableChoices(afterChoice).map((choice) => choice.id)).toEqual(["use-key"]);
  });

  it("resolves gameplay hook success and failure targets deterministically", () => {
    const state = choose(createInitialState(parsedFlowGame()), "take-key");

    const success = resolveGameplayHook(state, "unlock-door", "success");
    const failure = resolveGameplayHook(state, "unlock-door", "failure");

    expect(success.currentSceneId).toBe("beyond-door");
    expect(success.endingId).toBeUndefined();
    expect(failure.currentSceneId).toBe("locked-door");
    expect(failure.endingId).toBe("stuck");
  });
});
