import { describe, expect, it } from "vitest";
import { createExportPackage, formatValidationErrors, validateGame } from "./index";
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
  characters: [],
  assets: [],
  gameplayHooks: [],
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

  it("reports studio authoring reference, prompt, and layout problems", () => {
    const result = validateGame(
      {
        ...validGame,
        storyBible: {
          premise: "A studio project with intentionally broken authoring references.",
          genre: "test mystery",
          tone: "clinical",
          targetPlatform: "mobile web",
          targetPlayStyle: "validation",
          visualDirection: "test panels",
          pacingRules: ["Check references"],
          worldRules: ["Ids must resolve"],
          mainCast: ["missing_character"],
          keyLocations: ["test_room"],
          coreMystery: "Which references are broken?",
          chapterOutline: ["Broken setup"],
          writingStyleGuide: "Short and direct.",
          contentBoundaries: ["No production data"],
          gameplayModulePlan: ["inspection"]
        },
        items: [
          {
            id: "badge",
            name: "Charge Badge",
            kind: "item",
            description: "A simple test item.",
            imageAssetId: "missing_asset",
            initiallyOwned: false
          }
        ],
        assets: [
          {
            id: "asset_known",
            type: "background",
            title: "Known Asset",
            description: "A known asset with a broken scene link.",
            prompt: "Testing asset prompt.",
            aspectRatio: "16:9",
            targetDeviceUsage: "validation",
            linkedSceneIds: ["ghost_scene"],
            linkedCharacterIds: ["missing_character"],
            status: "needed"
          }
        ],
        gameplayHooks: [
          {
            id: "known-hook",
            type: "inspection",
            title: "Known Hook",
            module: "future-inspection-module",
            successTarget: { type: "scene", id: "ghost_scene" },
            failureTarget: { type: "ending", id: "clear" },
            assetRequirements: ["missing_asset"],
            notes: "Missing Studio prompt and layout notes on purpose."
          }
        ],
        scenes: [
          {
            ...validGame.scenes[0],
            assetIds: ["missing_asset"],
            blocks: [
              {
                type: "dialogue",
                speaker: "Missing",
                characterId: "missing_character",
                text: "This reference should fail."
              },
              {
                type: "gameplay_hook",
                hookId: "missing-hook"
              }
            ]
          }
        ]
      },
      "broken-studio-game.json"
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const formatted = formatValidationErrors(result.errors);
      expect(formatted).toContain("Character \"missing_character\" does not exist.");
      expect(formatted).toContain("Asset \"missing_asset\" does not exist.");
      expect(formatted).toContain("Gameplay hook \"missing-hook\" does not exist.");
      expect(formatted).toContain("missing mobile landscape layout notes");
      expect(formatted).toContain("missing a background image prompt");
      expect(formatted).toContain("missing an agent prompt");
    }
  });

  it("accepts rich studio-authored production data and exports a complete package", () => {
    const richGame: GameDefinition = {
      ...validGame,
      storyBible: {
        premise: "A precise courtroom mystery about a staged crime scene.",
        genre: "investigation courtroom",
        tone: "noir legal thriller",
        targetPlatform: "mobile web",
        targetPlayStyle: "dialogue, evidence, contradiction",
        visualDirection: "cold rain, polished wood, cyan evidence light",
        pacingRules: ["Open on pressure", "Alternate testimony and evidence"],
        worldRules: ["Physical evidence always beats testimony"],
        mainCast: ["mara_vey"],
        keyLocations: ["predawn_courtroom"],
        coreMystery: "A witness saw an impossible open window.",
        chapterOutline: ["Verdict before dawn", "The closed window"],
        writingStyleGuide: "Elegant, tense, intelligent, concise.",
        contentBoundaries: ["No gore", "No real cases"],
        gameplayModulePlan: ["contradiction", "inspection"]
      },
      characters: [
        {
          id: "mara_vey",
          displayName: "Mara Vey",
          role: "Defense attorney",
          archetype: "controlled investigator",
          biography: "A defense attorney who listens for impossible details.",
          traits: ["precise", "restrained", "relentless"],
          secrets: "She lost a case by trusting a clean story.",
          motivations: "Keep the wrong person from being convicted.",
          visualDescription: "Dark suit, rain-damp collar, sleepless eyes.",
          baseImagePrompt: "Noir defense attorney portrait, predawn courtroom light.",
          portraitUrl: "",
          emotions: ["neutral", "confident"],
          stances: ["reading_file", "presenting_evidence"],
          screenPositions: ["lower-left", "center-left"],
          voiceNotes: "Measured, exact, never theatrical.",
          relationshipNotes: "Respected by the judge, disliked by the prosecutor.",
          variants: [
            {
              emotionId: "confident",
              stanceId: "presenting_evidence",
              description: "Mara presents a contradiction with quiet force.",
              imagePrompt: "Noir attorney presenting evidence under courtroom rain light.",
              imageUrl: "",
              animation: "evidence-slam",
              usageNotes: "Use for major proof reveals."
            }
          ]
        }
      ],
      assets: [
        {
          id: "bg_courtroom_predawn_rain",
          type: "background",
          title: "Predawn Courtroom",
          description: "Rain-streaked courtroom before verdict.",
          prompt: "Cinematic noir courtroom before dawn, rain on high windows, no text.",
          negativePrompt: "cartoon, watermark, text",
          aspectRatio: "16:9",
          targetDeviceUsage: "mobile landscape stage",
          url: "",
          linkedSceneIds: ["start"],
          linkedCharacterIds: ["mara_vey"],
          status: "needed"
        }
      ],
      gameplayHooks: [
        {
          id: "contradiction_window",
          type: "contradiction",
          title: "The Window That Was Closed",
          module: "future-contradiction-module",
          narrativePurpose: "Prove the witness saw an impossible detail.",
          gameplayPurpose: "Select testimony and present evidence.",
          expectedPlayerAction: "Select statement four and present the photo.",
          requiredInputs: ["statement_selection", "evidence_selection"],
          successCondition: "Statement four plus crime scene photo.",
          failureCondition: "Wrong statement or irrelevant evidence.",
          successTarget: { type: "scene", id: "start" },
          failureTarget: { type: "ending", id: "clear" },
          uiLayoutNotes: "Statement cards center, evidence tray right.",
          mobileGestureNotes: "Tap statement, tap evidence, press present.",
          futureModuleType: "evidence-presentation",
          implementationNotes: "Attach a contradiction resolver later.",
          assetRequirements: ["bg_courtroom_predawn_rain"],
          agentPrompt: "Create a contradiction module spec for a closed-window clue.",
          notes: "Premium placeholder until module exists."
        }
      ],
      scenes: [
        {
          ...validGame.scenes[0],
          purpose: "Establish contradiction pressure.",
          synopsis: "Mara asks for one more question before verdict.",
          location: "predawn_courtroom",
          camera: "wide courtroom frame with witness upper right",
          backgroundImage: "",
          backgroundPrompt: "Cinematic noir courtroom before dawn, rain, no text.",
          musicMood: "low strings",
          soundMood: "rain, paper, fluorescent hum",
          transition: "fade_from_black",
          layoutNotes: {
            mobileLandscape: "16:9 stage, dialogue bottom, evidence tray collapsed.",
            mobilePortrait: "Stacked dialogue and character cards.",
            tablet: "Stage centered with metadata rail.",
            desktop: "Large stage with side panels."
          },
          blocks: [
            {
              type: "dialogue",
              speaker: "Mara Vey",
              characterId: "mara_vey",
              emotion: "confident",
              stance: "presenting_evidence",
              position: "lower-left",
              animation: "evidence-slam",
              text: "Then grant me one more question."
            },
            {
              type: "gameplay_hook",
              hookId: "contradiction_window",
              hook: {
                id: "contradiction_window_inline",
                type: "contradiction",
                title: "Inline Closed Window",
                module: "future-contradiction-module",
                narrativePurpose: "Inline hook compatibility.",
                gameplayPurpose: "Present proof.",
                expectedPlayerAction: "Select the impossible line.",
                requiredInputs: ["statement_selection"],
                successCondition: "Correct statement.",
                failureCondition: "Wrong proof.",
                successTarget: { type: "scene", id: "start" },
                failureTarget: { type: "ending", id: "clear" },
                uiLayoutNotes: "Inline premium sequence.",
                mobileGestureNotes: "Tap-first.",
                futureModuleType: "contradiction",
                implementationNotes: "Compatibility path.",
                assetRequirements: [],
                agentPrompt: "Draft implementation notes.",
                notes: "Inline hook still supported."
              }
            }
          ]
        }
      ]
    };

    const result = validateGame(richGame, "rich-game.json");

    expect(result.ok).toBe(true);
    if (result.ok) {
      const exported = createExportPackage(result.game);
      expect(Object.keys(exported.files).sort()).toEqual([
        "assets.json",
        "characters.json",
        "game.json",
        "gameplay-hooks.json",
        "implementation-plan.md",
        "prompts.md",
        "scenes.json",
        "story-bible.md"
      ]);
      expect(exported.files["story-bible.md"]).toContain("A precise courtroom mystery");
      expect(exported.files["prompts.md"]).toContain("bg_courtroom_predawn_rain");
    }
  });
});
