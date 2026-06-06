import { useEffect, useMemo, useState } from "react";
import {
  choose,
  createInitialState,
  getAvailableChoices,
  getCurrentEnding,
  getCurrentScene,
  getSceneGameplayHooks,
  resolveGameplayHook
} from "@adventurekit/core";
import type {
  CharacterDefinition,
  Choice,
  ContentBlock,
  GameDefinition,
  GameplayHook,
  ItemDefinition,
  RuntimeState
} from "@adventurekit/core";
import "./runtime.css";

export interface AdventureRuntimeProps {
  game: GameDefinition;
  className?: string;
  onStateChange?: (state: RuntimeState) => void;
}

function useRuntimeState(game: GameDefinition, onStateChange?: (state: RuntimeState) => void) {
  const [state, setState] = useState(() => createInitialState(game));

  useEffect(() => {
    setState(createInitialState(game));
  }, [game]);

  useEffect(() => {
    onStateChange?.(state);
  }, [onStateChange, state]);

  return [state, setState] as const;
}

function itemMap(items: ItemDefinition[]) {
  return new Map(items.map((item) => [item.id, item]));
}

function characterMap(characters: CharacterDefinition[]) {
  return new Map(characters.map((character) => [character.id, character]));
}

function SceneBlock({ block, characters }: { block: ContentBlock; characters: Map<string, CharacterDefinition> }) {
  if (block.type === "narration") {
    return <p className={["ak-narration", block.animation ? `ak-anim-${block.animation}` : ""].filter(Boolean).join(" ")}>{block.text}</p>;
  }

  if (block.type === "dialogue") {
    const character = block.characterId ? characters.get(block.characterId) : undefined;
    return (
      <div className={["ak-dialogue", block.animation ? `ak-anim-${block.animation}` : ""].filter(Boolean).join(" ")}>
        <div className="ak-portrait-card" aria-hidden="true">
          <strong>{(character?.displayName ?? block.speaker).slice(0, 2).toUpperCase()}</strong>
          <span>{block.emotion ?? "focused"}</span>
        </div>
        <span className="ak-speaker">{block.speaker}</span>
        {(block.emotion || block.stance || block.position) && (
          <span className="ak-performance">
            {[block.emotion, block.stance, block.position].filter(Boolean).join(" / ")}
          </span>
        )}
        <p>{block.text}</p>
      </div>
    );
  }

  return null;
}

function TargetLabel({ target }: { target: GameplayHook["successTarget"] }) {
  return (
    <span className="ak-target-label">
      {target.type}: {target.id}
    </span>
  );
}

function GameplayHookPanel({
  hook,
  onResolve
}: {
  hook: GameplayHook;
  onResolve: (hookId: string, outcome: "success" | "failure") => void;
}) {
  return (
    <section className="ak-hook" aria-label={`Gameplay hook ${hook.id}`}>
      <div className="ak-hook-header">
        <div>
          <span className="ak-section-label">Gameplay Hook</span>
          <h3>{hook.id}</h3>
        </div>
        <span className="ak-hook-type">{hook.type}</span>
      </div>

      <dl className="ak-hook-details">
        <div>
          <dt>Future module</dt>
          <dd>{hook.futureModuleType ?? hook.module}</dd>
        </div>
        <div>
          <dt>Success target</dt>
          <dd><TargetLabel target={hook.successTarget} /></dd>
        </div>
        <div>
          <dt>Failure target</dt>
          <dd><TargetLabel target={hook.failureTarget} /></dd>
        </div>
      </dl>

      <p className="ak-hook-notes">{hook.narrativePurpose ?? hook.notes}</p>
      {(hook.expectedPlayerAction || hook.requiredInputs?.length) && (
        <div className="ak-hook-play-spec">
          {hook.expectedPlayerAction && <span>{hook.expectedPlayerAction}</span>}
          {hook.requiredInputs?.map((input) => <span key={input}>{input}</span>)}
        </div>
      )}

      <div className="ak-hook-actions">
        <button type="button" onClick={() => onResolve(hook.id, "success")}>
          Simulate Success
        </button>
        <button type="button" className="ak-danger" onClick={() => onResolve(hook.id, "failure")}>
          Simulate Failure
        </button>
      </div>
    </section>
  );
}

function ChoiceList({ choices, onChoose }: { choices: Choice[]; onChoose: (choiceId: string) => void }) {
  if (choices.length === 0) {
    return null;
  }

  return (
    <div className="ak-choice-list" aria-label="Scene choices">
      {choices.map((choice) => (
        <button type="button" key={choice.id} onClick={() => onChoose(choice.id)}>
          {choice.label}
        </button>
      ))}
    </div>
  );
}

function InventoryPanel({
  state,
  items
}: {
  state: RuntimeState;
  items: Map<string, ItemDefinition>;
}) {
  if (state.game.items.length === 0) {
    return null;
  }

  const ownedItems = state.inventory.map((itemId) => items.get(itemId)).filter((item): item is ItemDefinition => Boolean(item));

  return (
    <aside className="ak-inventory" aria-label="Inventory and evidence">
      <div className="ak-panel-heading">
        <span className="ak-section-label">Evidence</span>
        <strong>{ownedItems.length}</strong>
      </div>
      {ownedItems.length === 0 ? (
        <p className="ak-empty">No evidence logged.</p>
      ) : (
        <ul>
          {ownedItems.map((item) => (
            <li key={item.id}>
              <span>{item.kind}</span>
              <strong>{item.name}</strong>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function VariableReadout({ state }: { state: RuntimeState }) {
  const entries = Object.entries(state.variables);
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="ak-variable-readout" aria-label="Current variables">
      {entries.map(([name, value]) => (
        <span key={name}>
          {name}: {String(value)}
        </span>
      ))}
    </div>
  );
}

export function AdventureRuntime({ game, className, onStateChange }: AdventureRuntimeProps) {
  const [state, setState] = useRuntimeState(game, onStateChange);
  const scene = getCurrentScene(state);
  const ending = getCurrentEnding(state);
  const choices = getAvailableChoices(state);
  const items = useMemo(() => itemMap(game.items), [game.items]);
  const characters = useMemo(() => characterMap(game.characters), [game.characters]);
  const hooks = getSceneGameplayHooks(scene, game);

  function handleChoice(choiceId: string) {
    setState((current) => choose(current, choiceId));
  }

  function handleHook(hookId: string, outcome: "success" | "failure") {
    setState((current) => resolveGameplayHook(current, hookId, outcome));
  }

  function restart() {
    setState(createInitialState(game));
  }

  function hookForBlock(block: ContentBlock) {
    if (block.type !== "gameplay_hook") {
      return undefined;
    }
    return block.hook ?? hooks.find((hook) => hook.id === block.hookId);
  }

  return (
    <div className={["ak-runtime", className].filter(Boolean).join(" ")}>
      <div className="ak-stage">
        <div className="ak-scene-backdrop" aria-hidden="true" />
        <section className="ak-scene" key={ending?.id ?? scene.id}>
          <header className="ak-scene-header">
            <div>
              <span className="ak-section-label">{game.metadata.genre}</span>
              <h2>{ending?.title ?? scene.title}</h2>
            </div>
            {!ending && (
              <div className="ak-mood-list">
                {scene.mood.map((mood) => (
                  <span key={mood}>{mood}</span>
                ))}
              </div>
            )}
          </header>

          {ending ? (
            <div className="ak-ending">
              <span>{ending.tone}</span>
              <p>{ending.summary}</p>
              {ending.cinematicNotes && <small>{ending.cinematicNotes}</small>}
              <button type="button" onClick={restart}>Restart Prototype</button>
            </div>
          ) : (
            <>
              <p className="ak-background">{scene.background}</p>
              {(scene.backgroundPrompt || scene.camera || scene.transition) && (
                <div className="ak-cinematic-notes">
                  {scene.camera && <span>Camera: {scene.camera}</span>}
                  {scene.transition && <span>Transition: {scene.transition}</span>}
                  {scene.backgroundPrompt && <span>Prompt ready</span>}
                </div>
              )}
              <div className="ak-script">
                {scene.blocks.map((block, index) => {
                  const hook = hookForBlock(block);
                  return block.type === "gameplay_hook" ? (
                    hook ? <GameplayHookPanel key={`${hook.id}-${index}`} hook={hook} onResolve={handleHook} /> : null
                  ) : (
                    <SceneBlock key={`${block.type}-${index}`} block={block} characters={characters} />
                  );
                })}
              </div>
              <ChoiceList choices={choices} onChoose={handleChoice} />
            </>
          )}
        </section>
      </div>

      <div className="ak-side-rail">
        <InventoryPanel state={state} items={items} />
        <VariableReadout state={state} />
        {hooks.length > 0 && (
          <div className="ak-hook-index" aria-label="Active gameplay hooks">
            <span className="ak-section-label">Active hook zones</span>
            {hooks.map((hook) => (
              <span key={hook.id}>{hook.id}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type { RuntimeState };
