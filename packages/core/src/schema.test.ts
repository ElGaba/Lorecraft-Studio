import { describe, expect, it } from "vitest";
import { formatValidationErrors, validateGame } from "./index";
import type { GameDefinition } from "./index";

const validGame: GameDefinition = {
  metadata: {
    id: "test-game",
    title: "Test Game",
    genre: "procedure drama",
    author: "AdventureKit",
    summary: "A tiny valid game."
  },
  startScene: "start",
  variables: {
    confidence: 0
  },
  items: [
    {
      id: "badge",
      name: "Charge Badge",
      kind: "item",
      description: "A simple test item.",
      initiallyOwned: false
    }
  ],
  scenes: [
    {
      id: "start",
      title: "Start",
      background: "A compact testing room.",
      mood: ["focused"],
      blocks: [
        {
          type: "narration",
          text: "The test begins."
        }
      ],
      choices: [
        {
          id: "continue",
          label: "Continue",
          target: { type: "ending", id: "clear" },
          effects: [{ type: "setVariable", variable: "confidence", value: 1 }]
        }
      ]
    }
  ],
  endings: [
    {
      id: "clear",
      title: "Clear Result",
      tone: "hopeful",
      summary: "The flow reached a valid ending."
    }
  ]
};

describe("AdventureKit schema validation", () => {
  it("accepts a complete game definition with metadata, scenes, choices, variables, items, and endings", () => {
    const result = validateGame(validGame, "valid-game.json");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.game.metadata.id).toBe("test-game");
      expect(result.game.startScene).toBe("start");
    }
  });

  it("returns understandable validation errors for malformed game content", () => {
    const result = validateGame(
      {
        ...validGame,
        startScene: "missing-scene",
        scenes: [
          {
            ...validGame.scenes[0],
            choices: [
              {
                id: "broken-choice",
                label: "Broken choice",
                target: { type: "scene", id: "ghost" }
              }
            ]
          }
        ]
      },
      "broken-game.json"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const formatted = formatValidationErrors(result.errors);
      expect(formatted).toContain("broken-game.json");
      expect(formatted).toContain("startScene");
      expect(formatted).toContain("missing-scene");
      expect(formatted).toContain("choices[0].target.id");
      expect(formatted).toContain("ghost");
    }
  });
});
