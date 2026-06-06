import type { CharacterDefinition, GameDefinition, GameplayHook, SceneDefinition } from "@adventurekit/core";

export const agentActionIds = [
  "improve_scene",
  "generate_background_prompt",
  "generate_character_sheet",
  "generate_dialogue",
  "expand_story_branch",
  "generate_gameplay_hook_spec",
  "cinematic_polish_pass"
] as const;

export type AgentActionId = typeof agentActionIds[number];

export interface AgentBridgeSettings {
  endpointUrl: string;
  providerLabel: string;
  applyMode: "review" | "auto-apply";
}

export interface AgentActionContext {
  game: GameDefinition;
  scene?: SceneDefinition;
  character?: CharacterDefinition;
  hook?: GameplayHook;
}

export interface AgentPromptPayload {
  action: AgentActionId;
  providerLabel: string;
  applyMode: AgentBridgeSettings["applyMode"];
  prompt: string;
}

export type AgentBridgeResult =
  | {
      status: "fallback";
      payload: AgentPromptPayload;
    }
  | {
      status: "response";
      payload: AgentPromptPayload;
      text: string;
    };

function compactScene(scene: SceneDefinition | undefined) {
  if (!scene) {
    return "No scene selected.";
  }

  return JSON.stringify({
    id: scene.id,
    title: scene.title,
    purpose: scene.purpose,
    synopsis: scene.synopsis,
    location: scene.location,
    camera: scene.camera,
    background: scene.background,
    backgroundPrompt: scene.backgroundPrompt,
    layoutNotes: scene.layoutNotes,
    assetIds: scene.assetIds,
    mood: scene.mood,
    blocks: scene.blocks,
    choices: scene.choices
  }, null, 2);
}

function compactCharacter(character: CharacterDefinition | undefined) {
  return character ? JSON.stringify(character, null, 2) : "No character selected.";
}

function compactHook(hook: GameplayHook | undefined) {
  return hook ? JSON.stringify(hook, null, 2) : "No gameplay hook selected.";
}

export function buildAgentPrompt(action: AgentActionId, context: AgentActionContext): string {
  const projectLine = `${context.game.metadata.title} (${context.game.metadata.genre})`;
  const bibleLine = context.game.storyBible
    ? `${context.game.storyBible.premise}\nTone: ${context.game.storyBible.tone}\nVisual direction: ${context.game.storyBible.visualDirection}`
    : context.game.metadata.summary;

  const instructions: Record<AgentActionId, string> = {
    improve_scene: "Improve the selected scene draft while preserving JSON ids, route targets, and playable choice intent.",
    generate_background_prompt: "Create a production-ready background image prompt and negative prompt for the selected scene.",
    generate_character_sheet: "Expand the selected character into a visual-novel character sheet with emotion, stance, and portrait variant notes.",
    generate_dialogue: "Write concise cinematic dialogue lines that match the project tone and the selected scene purpose.",
    expand_story_branch: "Propose one additional playable branch with scene id, choice id, narrative stakes, and ending impact.",
    generate_gameplay_hook_spec: "Turn the selected hook into an implementation-ready mobile gameplay module spec.",
    cinematic_polish_pass: "Polish camera, transition, sound, animation, and mobile layout notes for a premium cinematic pass."
  };

  return [
    `Action: ${action}`,
    `Project: ${projectLine}`,
    "",
    "Story Bible:",
    bibleLine,
    "",
    "Instruction:",
    instructions[action],
    "",
    "Selected Scene:",
    compactScene(context.scene),
    "",
    "Selected Character:",
    compactCharacter(context.character),
    "",
    "Selected Gameplay Hook:",
    compactHook(context.hook),
    "",
    "Return concise structured output that can be reviewed before being applied."
  ].join("\n");
}

export function buildAgentPayload(
  action: AgentActionId,
  settings: AgentBridgeSettings,
  context: AgentActionContext
): AgentPromptPayload {
  return {
    action,
    providerLabel: settings.providerLabel,
    applyMode: settings.applyMode,
    prompt: buildAgentPrompt(action, context)
  };
}

export async function runAgentBridge(
  action: AgentActionId,
  settings: AgentBridgeSettings,
  context: AgentActionContext
): Promise<AgentBridgeResult> {
  const payload = buildAgentPayload(action, settings, context);

  if (!settings.endpointUrl.trim()) {
    return { status: "fallback", payload };
  }

  try {
    const response = await fetch(settings.endpointUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      return { status: "fallback", payload };
    }

    return {
      status: "response",
      payload,
      text: await response.text()
    };
  } catch {
    return { status: "fallback", payload };
  }
}
