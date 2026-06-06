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
  AssetDefinition,
  CharacterDefinition,
  Choice,
  ContentBlock,
  GameDefinition,
  GameplayHook,
  ItemDefinition,
  RuntimeState,
  SceneDefinition
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

function assetMap(assets: AssetDefinition[]) {
  return new Map(assets.map((asset) => [asset.id, asset]));
}

function characterMap(characters: CharacterDefinition[]) {
  return new Map(characters.map((character) => [character.id, character]));
}

type DialogueBlock = Extract<ContentBlock, { type: "dialogue" }>;

function characterImage(character: CharacterDefinition | undefined, block?: DialogueBlock) {
  if (!character) {
    return "";
  }

  const exactVariant = block
    ? character.variants.find((variant) => variant.emotionId === block.emotion && variant.stanceId === block.stance)
    : undefined;
  const emotionVariant = block
    ? character.variants.find((variant) => variant.emotionId === block.emotion)
    : undefined;

  return exactVariant?.imageUrl ?? emotionVariant?.imageUrl ?? character.portraitUrl ?? "";
}

function positionClass(position: string | undefined) {
  if (position?.includes("right")) {
    return "is-right";
  }
  if (position?.includes("center")) {
    return "is-center";
  }
  return "is-left";
}

function sceneBackgroundUrl(scene: SceneDefinition, game: GameDefinition, assets: Map<string, AssetDefinition>) {
  if (scene.backgroundImage) {
    return scene.backgroundImage;
  }

  return scene.assetIds
    ?.map((assetId) => assets.get(assetId))
    .find((asset) => asset?.url && ["background", "cg_cutscene"].includes(asset.type))
    ?.url ?? "";
}

function sceneDialogueBlocks(scene: SceneDefinition, characters: Map<string, CharacterDefinition>) {
  const seen = new Set<string>();
  const blocks: DialogueBlock[] = [];

  scene.blocks.forEach((block) => {
    if (block.type !== "dialogue" || !block.characterId || seen.has(block.characterId)) {
      return;
    }

    const character = characters.get(block.characterId);
    if (!characterImage(character, block)) {
      return;
    }

    seen.add(block.characterId);
    blocks.push(block);
  });

  return blocks;
}

function SceneCharacterLayer({
  scene,
  characters,
  activeBlock
}: {
  scene: SceneDefinition;
  characters: Map<string, CharacterDefinition>;
  activeBlock?: DialogueBlock;
}) {
  const blocks = sceneDialogueBlocks(scene, characters);
  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="ak-character-layer" aria-label="Scene characters">
      {blocks.map((block) => {
        const character = block.characterId ? characters.get(block.characterId) : undefined;
        const imageUrl = characterImage(character, block);
        if (!character || !imageUrl) {
          return null;
        }

        const isActive = !activeBlock || activeBlock.characterId === character.id;

        return (
          <img
            key={character.id}
            className={[
              "ak-character-sprite",
              positionClass(block.position),
              isActive ? "is-active" : "is-muted",
              isActive && block.animation ? `ak-anim-${block.animation}` : ""
            ].filter(Boolean).join(" ")}
            src={imageUrl}
            alt={character.displayName}
          />
        );
      })}
    </div>
  );
}

function SceneBlock({ block, characters }: { block: ContentBlock; characters: Map<string, CharacterDefinition> }) {
  if (block.type === "narration") {
    return <p className={["ak-narration", block.animation ? `ak-anim-${block.animation}` : ""].filter(Boolean).join(" ")}>{block.text}</p>;
  }

  if (block.type === "dialogue") {
    const character = block.characterId ? characters.get(block.characterId) : undefined;
    const imageUrl = characterImage(character, block);
    return (
      <div className={["ak-dialogue", block.animation ? `ak-anim-${block.animation}` : ""].filter(Boolean).join(" ")}>
        <div className="ak-portrait-card" aria-hidden="true">
          {imageUrl ? (
            <img src={imageUrl} alt="" />
          ) : (
            <strong>{(character?.displayName ?? block.speaker).slice(0, 2).toUpperCase()}</strong>
          )}
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
  const isCourtroomHook = hook.type === "evidence_presentation" || hook.type === "contradiction";
  const hookLabel = isCourtroomHook ? "Cross-Examination" : "Gameplay Hook";
  const hookTitle = isCourtroomHook ? "Find the contradiction" : hook.id;
  const hookPrompt = isCourtroomHook ? hook.expectedPlayerAction ?? hook.narrativePurpose ?? hook.notes : "";
  const successLabel = isCourtroomHook ? "Present Evidence" : "Simulate Success";
  const failureLabel = isCourtroomHook ? "Press Witness" : "Simulate Failure";

  return (
    <section className="ak-hook" aria-label={`Gameplay hook ${hook.id}`}>
      <div className="ak-hook-header">
        <div>
          <span className="ak-section-label">{hookLabel}</span>
          <h3>{hookTitle}</h3>
        </div>
        <span className="ak-hook-type">{hook.type}</span>
      </div>

      {hookPrompt && <p className="ak-hook-prompt">{hookPrompt}</p>}

      <div className="ak-hook-actions">
        <button type="button" onClick={() => onResolve(hook.id, "success")}>
          {successLabel}
        </button>
        <button type="button" className="ak-danger" onClick={() => onResolve(hook.id, "failure")}>
          {failureLabel}
        </button>
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
  items,
  assets
}: {
  state: RuntimeState;
  items: Map<string, ItemDefinition>;
  assets: Map<string, AssetDefinition>;
}) {
  if (state.game.items.length === 0) {
    return null;
  }

  const ownedItems = state.inventory.map((itemId) => items.get(itemId)).filter((item): item is ItemDefinition => Boolean(item));

  return (
    <aside className="ak-inventory" aria-label="Inventory and evidence">
      <div className="ak-panel-heading">
        <span className="ak-section-label">Court Record</span>
        <strong>{ownedItems.length}</strong>
      </div>
      {ownedItems.length === 0 ? (
        <p className="ak-empty">No evidence logged.</p>
      ) : (
        <ul>
          {ownedItems.map((item) => (
            <li key={item.id} className={item.imageAssetId && assets.get(item.imageAssetId)?.url ? "has-image" : ""}>
              {item.imageAssetId && assets.get(item.imageAssetId)?.url && (
                <img src={assets.get(item.imageAssetId)?.url} alt="" />
              )}
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
  const [scriptCursor, setScriptCursor] = useState(0);
  const scene = getCurrentScene(state);
  const ending = getCurrentEnding(state);
  const choices = getAvailableChoices(state);
  const items = useMemo(() => itemMap(game.items), [game.items]);
  const assets = useMemo(() => assetMap(game.assets), [game.assets]);
  const characters = useMemo(() => characterMap(game.characters), [game.characters]);
  const hooks = getSceneGameplayHooks(scene, game);
  const backgroundUrl = ending ? "" : sceneBackgroundUrl(scene, game, assets);
  const isArtScene = Boolean(backgroundUrl) && !ending;
  const artStoryBlocks = isArtScene
    ? scene.blocks.filter((block): block is Extract<ContentBlock, { type: "dialogue" | "narration" }> => block.type === "dialogue" || block.type === "narration")
    : [];
  const safeScriptCursor = Math.min(scriptCursor, artStoryBlocks.length);
  const activeStoryBlock = isArtScene && safeScriptCursor < artStoryBlocks.length ? artStoryBlocks[safeScriptCursor] : undefined;
  const activeDialogueBlock = activeStoryBlock?.type === "dialogue" ? activeStoryBlock : undefined;
  const isArtScriptComplete = !isArtScene || artStoryBlocks.length === 0 || safeScriptCursor >= artStoryBlocks.length;
  const visibleBlocks = isArtScene
    ? isArtScriptComplete
      ? scene.blocks.filter((block) => block.type === "gameplay_hook")
      : activeStoryBlock
        ? [activeStoryBlock]
        : []
    : scene.blocks;
  const visibleChoices = isArtScriptComplete ? choices : [];
  const visibleHooks = isArtScriptComplete ? hooks : [];
  const advanceLabel = safeScriptCursor < artStoryBlocks.length - 1 ? "Advance testimony" : "Start cross-examination";

  useEffect(() => {
    setScriptCursor(0);
  }, [ending?.id, game.metadata.id, scene.id]);

  function handleChoice(choiceId: string) {
    setState((current) => choose(current, choiceId));
  }

  function handleHook(hookId: string, outcome: "success" | "failure") {
    setState((current) => resolveGameplayHook(current, hookId, outcome));
  }

  function restart() {
    setState(createInitialState(game));
  }

  function advanceScript() {
    setScriptCursor((current) => Math.min(current + 1, artStoryBlocks.length));
  }

  function hookForBlock(block: ContentBlock) {
    if (block.type !== "gameplay_hook") {
      return undefined;
    }
    return block.hook ?? hooks.find((hook) => hook.id === block.hookId);
  }

  return (
    <div className={["ak-runtime", className].filter(Boolean).join(" ")}>
      <div className={["ak-stage", backgroundUrl ? "has-art" : ""].filter(Boolean).join(" ")}>
        {backgroundUrl ? (
          <img className="ak-scene-image" src={backgroundUrl} alt={`Scene background: ${scene.title}`} />
        ) : (
          <div className="ak-scene-backdrop" aria-hidden="true" />
        )}
        {!ending && <SceneCharacterLayer scene={scene} characters={characters} activeBlock={activeDialogueBlock} />}
        <section className={["ak-scene", backgroundUrl ? "has-art" : ""].filter(Boolean).join(" ")} key={ending?.id ?? scene.id}>
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
              <div className={["ak-script", isArtScene && !isArtScriptComplete ? "is-vn-beat" : ""].filter(Boolean).join(" ")} aria-live={isArtScene ? "polite" : undefined}>
                {visibleBlocks.map((block, index) => {
                  const hook = hookForBlock(block);
                  return block.type === "gameplay_hook" ? (
                    hook ? <GameplayHookPanel key={`${hook.id}-${index}`} hook={hook} onResolve={handleHook} /> : null
                  ) : (
                    <SceneBlock key={`${block.type}-${index}`} block={block} characters={characters} />
                  );
                })}
                {isArtScene && !isArtScriptComplete && (
                  <button type="button" className="ak-dialogue-advance" onClick={advanceScript}>
                    {advanceLabel}
                  </button>
                )}
              </div>
              <ChoiceList choices={visibleChoices} onChoose={handleChoice} />
            </>
          )}
        </section>
      </div>

      <div className="ak-side-rail">
        <InventoryPanel state={state} items={items} assets={assets} />
        <VariableReadout state={state} />
        {visibleHooks.length > 0 && (
          <div className="ak-hook-index" aria-label="Active gameplay hooks">
            <span className="ak-section-label">Active hook zones</span>
            {visibleHooks.map((hook) => (
              <span key={hook.id}>{hook.id}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export type { RuntimeState };
