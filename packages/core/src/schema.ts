import { z } from "zod";

export const variableValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const targetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("scene"),
    id: z.string().min(1)
  }),
  z.object({
    type: z.literal("ending"),
    id: z.string().min(1)
  })
]);

export const effectSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("setVariable"),
    variable: z.string().min(1),
    value: variableValueSchema
  }),
  z.object({
    type: z.literal("incrementVariable"),
    variable: z.string().min(1),
    by: z.number()
  }),
  z.object({
    type: z.literal("addItem"),
    itemId: z.string().min(1)
  }),
  z.object({
    type: z.literal("removeItem"),
    itemId: z.string().min(1)
  })
]);

export const conditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hasItem"),
    itemId: z.string().min(1)
  }),
  z.object({
    type: z.literal("notHasItem"),
    itemId: z.string().min(1)
  }),
  z.object({
    type: z.literal("variableEquals"),
    variable: z.string().min(1),
    value: variableValueSchema
  }),
  z.object({
    type: z.literal("variableNotEquals"),
    variable: z.string().min(1),
    value: variableValueSchema
  }),
  z.object({
    type: z.literal("variableAtLeast"),
    variable: z.string().min(1),
    value: z.number()
  }),
  z.object({
    type: z.literal("variableLessThan"),
    variable: z.string().min(1),
    value: z.number()
  })
]);

export const choiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  tone: z.string().optional(),
  target: targetSchema,
  conditions: z.array(conditionSchema).optional(),
  effects: z.array(effectSchema).optional()
});

export const animationPresetSchema = z.enum([
  "fade-in",
  "slide-in-left",
  "slide-in-right",
  "subtle-breathing",
  "tense-shake",
  "evidence-slam",
  "tool-ready",
  "dramatic-zoom",
  "camera-pan",
  "flash-cut",
  "screen-shake",
  "pulse-alert"
]);

export const gameplayHookSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "procedure_interaction",
    "evidence_presentation",
    "contradiction",
    "puzzle",
    "inspection",
    "object_manipulation",
    "timed_choice",
    "rhythm_or_precision",
    "custom"
  ]).or(z.string().min(1)),
  title: z.string().optional(),
  module: z.string().min(1),
  narrativePurpose: z.string().optional(),
  gameplayPurpose: z.string().optional(),
  expectedPlayerAction: z.string().optional(),
  requiredInputs: z.array(z.string().min(1)).optional(),
  successCondition: z.string().optional(),
  failureCondition: z.string().optional(),
  successTarget: targetSchema,
  failureTarget: targetSchema,
  successEffects: z.array(effectSchema).optional(),
  failureEffects: z.array(effectSchema).optional(),
  uiLayoutNotes: z.string().optional(),
  mobileGestureNotes: z.string().optional(),
  futureModuleType: z.string().optional(),
  implementationNotes: z.string().optional(),
  assetRequirements: z.array(z.string().min(1)).optional(),
  agentPrompt: z.string().optional(),
  notes: z.string().min(1)
});

export const narrationBlockSchema = z.object({
  type: z.literal("narration"),
  text: z.string().min(1),
  tone: z.string().optional(),
  animation: animationPresetSchema.optional()
});

export const dialogueBlockSchema = z.object({
  type: z.literal("dialogue"),
  speaker: z.string().min(1),
  characterId: z.string().optional(),
  emotion: z.string().optional(),
  stance: z.string().optional(),
  position: z.string().optional(),
  animation: animationPresetSchema.optional(),
  text: z.string().min(1)
});

export const gameplayHookBlockSchema = z.object({
  type: z.literal("gameplay_hook"),
  hookId: z.string().min(1).optional(),
  hook: gameplayHookSchema.optional()
}).refine((block) => block.hookId || block.hook, {
  message: "Gameplay hook blocks require hookId or inline hook."
});

export const contentBlockSchema = z.union([
  narrationBlockSchema,
  dialogueBlockSchema,
  gameplayHookBlockSchema
]);

export const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["item", "evidence"]),
  description: z.string().min(1),
  imageAssetId: z.string().optional(),
  initiallyOwned: z.boolean().optional()
});

export const layoutNotesSchema = z.object({
  mobileLandscape: z.string().min(1),
  mobilePortrait: z.string().min(1).optional(),
  tablet: z.string().min(1).optional(),
  desktop: z.string().min(1).optional()
});

export const sceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  purpose: z.string().optional(),
  synopsis: z.string().optional(),
  location: z.string().optional(),
  camera: z.string().optional(),
  background: z.string().min(1),
  backgroundImage: z.string().optional(),
  backgroundPrompt: z.string().optional(),
  musicMood: z.string().optional(),
  soundMood: z.string().optional(),
  transition: z.string().optional(),
  layoutNotes: layoutNotesSchema.optional(),
  assetIds: z.array(z.string().min(1)).optional(),
  mood: z.array(z.string().min(1)).min(1),
  blocks: z.array(contentBlockSchema).min(1),
  choices: z.array(choiceSchema).optional()
});

export const endingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tone: z.string().min(1),
  summary: z.string().min(1),
  cinematicNotes: z.string().optional()
});

export const characterVariantSchema = z.object({
  emotionId: z.string().min(1),
  stanceId: z.string().min(1),
  description: z.string().min(1),
  imagePrompt: z.string().min(1),
  imageUrl: z.string().optional(),
  animation: animationPresetSchema.or(z.string().min(1)).optional(),
  usageNotes: z.string().min(1)
});

export const characterSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  role: z.string().min(1),
  archetype: z.string().min(1),
  biography: z.string().min(1),
  traits: z.array(z.string().min(1)).min(1),
  secrets: z.string().min(1),
  motivations: z.string().min(1),
  visualDescription: z.string().min(1),
  baseImagePrompt: z.string().min(1),
  portraitUrl: z.string().optional(),
  emotions: z.array(z.string().min(1)).min(1),
  stances: z.array(z.string().min(1)).min(1),
  screenPositions: z.array(z.string().min(1)).min(1),
  voiceNotes: z.string().min(1),
  relationshipNotes: z.string().min(1),
  variants: z.array(characterVariantSchema).min(1)
});

export const assetSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "background",
    "character_portrait",
    "character_variant",
    "cg_cutscene",
    "ui_overlay",
    "evidence_item",
    "gameplay_hook_concept"
  ]).or(z.string().min(1)),
  title: z.string().min(1),
  description: z.string().min(1),
  prompt: z.string().min(1),
  negativePrompt: z.string().optional(),
  aspectRatio: z.string().min(1),
  targetDeviceUsage: z.string().min(1),
  url: z.string().optional(),
  linkedSceneIds: z.array(z.string().min(1)).optional(),
  linkedCharacterIds: z.array(z.string().min(1)).optional(),
  status: z.enum(["needed", "prompted", "generated", "approved", "replaced"])
});

export const storyBibleSchema = z.object({
  premise: z.string().min(1),
  genre: z.string().min(1),
  tone: z.string().min(1),
  targetPlatform: z.string().min(1),
  targetPlayStyle: z.string().min(1),
  visualDirection: z.string().min(1),
  pacingRules: z.array(z.string().min(1)).min(1),
  worldRules: z.array(z.string().min(1)).min(1),
  mainCast: z.array(z.string().min(1)).min(1),
  keyLocations: z.array(z.string().min(1)).min(1),
  coreMystery: z.string().min(1),
  chapterOutline: z.array(z.string().min(1)).min(1),
  writingStyleGuide: z.string().min(1),
  contentBoundaries: z.array(z.string().min(1)).min(1),
  gameplayModulePlan: z.array(z.string().min(1)).min(1)
});

export const gameSchema = z.object({
  metadata: z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    genre: z.string().min(1),
    author: z.string().min(1),
    summary: z.string().min(1)
  }),
  startScene: z.string().min(1),
  variables: z.record(variableValueSchema).default({}),
  items: z.array(itemSchema).default([]),
  storyBible: storyBibleSchema.optional(),
  characters: z.array(characterSchema).default([]),
  assets: z.array(assetSchema).default([]),
  gameplayHooks: z.array(gameplayHookSchema).default([]),
  scenes: z.array(sceneSchema).min(1),
  endings: z.array(endingSchema).min(1)
});
