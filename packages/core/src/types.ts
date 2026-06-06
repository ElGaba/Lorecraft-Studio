import type { z } from "zod";
import type {
  choiceSchema,
  conditionSchema,
  contentBlockSchema,
  effectSchema,
  assetSchema,
  characterSchema,
  characterVariantSchema,
  gameSchema,
  gameplayHookBlockSchema,
  gameplayHookSchema,
  itemSchema,
  sceneSchema,
  targetSchema,
  variableValueSchema
} from "./schema";

export type VariableValue = z.infer<typeof variableValueSchema>;
export type Target = z.infer<typeof targetSchema>;
export type Effect = z.infer<typeof effectSchema>;
export type Condition = z.infer<typeof conditionSchema>;
export type Choice = z.infer<typeof choiceSchema>;
export type GameplayHook = z.infer<typeof gameplayHookSchema>;
export type GameplayHookBlock = z.infer<typeof gameplayHookBlockSchema>;
export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type ItemDefinition = z.infer<typeof itemSchema>;
export type CharacterVariant = z.infer<typeof characterVariantSchema>;
export type CharacterDefinition = z.infer<typeof characterSchema>;
export type AssetDefinition = z.infer<typeof assetSchema>;
export type SceneDefinition = z.infer<typeof sceneSchema>;
export type GameDefinition = z.infer<typeof gameSchema>;

export interface ValidationError {
  source: string;
  path: string;
  message: string;
}

export type ValidationResult =
  | {
      ok: true;
      source: string;
      game: GameDefinition;
    }
  | {
      ok: false;
      source: string;
      errors: ValidationError[];
    };

export interface HistoryEntry {
  fromSceneId: string;
  toSceneId?: string;
  endingId?: string;
  actionId: string;
  actionType: "choice" | "gameplay_hook";
  outcome?: "success" | "failure";
}

export interface RuntimeState {
  game: GameDefinition;
  currentSceneId: string;
  variables: Record<string, VariableValue>;
  inventory: string[];
  endingId?: string;
  history: HistoryEntry[];
}
