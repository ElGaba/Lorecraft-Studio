import type { GameplayHook, RuntimeState } from "@adventurekit/core";

export interface GameplayModuleMountContext {
  hook: GameplayHook;
  state: RuntimeState;
  resolve(outcome: "success" | "failure"): void;
}

export interface GameplayModuleAdapter {
  id: string;
  hookTypes: string[];
  mount(element: HTMLElement, context: GameplayModuleMountContext): void | (() => void);
}

export function createPhaserBridgePlaceholder(): GameplayModuleAdapter {
  return {
    id: "phaser-bridge-placeholder",
    hookTypes: ["procedure_interaction", "evidence_presentation", "puzzle", "inspection", "object_manipulation"],
    mount(element, context) {
      element.dataset.adventurekitHookId = context.hook.id;
      element.dataset.adventurekitBridge = "placeholder";
      element.textContent = `Future Phaser module "${context.hook.module}" will mount here.`;
    }
  };
}
