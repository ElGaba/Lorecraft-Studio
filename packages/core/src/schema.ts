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
  target: targetSchema,
  conditions: z.array(conditionSchema).optional(),
  effects: z.array(effectSchema).optional()
});

export const gameplayHookSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  module: z.string().min(1),
  successTarget: targetSchema,
  failureTarget: targetSchema,
  successEffects: z.array(effectSchema).optional(),
  failureEffects: z.array(effectSchema).optional(),
  notes: z.string().min(1)
});

export const narrationBlockSchema = z.object({
  type: z.literal("narration"),
  text: z.string().min(1)
});

export const dialogueBlockSchema = z.object({
  type: z.literal("dialogue"),
  speaker: z.string().min(1),
  text: z.string().min(1)
});

export const gameplayHookBlockSchema = z.object({
  type: z.literal("gameplay_hook"),
  hook: gameplayHookSchema
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  narrationBlockSchema,
  dialogueBlockSchema,
  gameplayHookBlockSchema
]);

export const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.enum(["item", "evidence"]),
  description: z.string().min(1),
  initiallyOwned: z.boolean().optional()
});

export const sceneSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  background: z.string().min(1),
  mood: z.array(z.string().min(1)).min(1),
  blocks: z.array(contentBlockSchema).min(1),
  choices: z.array(choiceSchema).optional()
});

export const endingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  tone: z.string().min(1),
  summary: z.string().min(1)
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
  scenes: z.array(sceneSchema).min(1),
  endings: z.array(endingSchema).min(1)
});
