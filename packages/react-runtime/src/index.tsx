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
  initialState?: RuntimeState;
  onStateChange?: (state: RuntimeState) => void;
  presentation?: "preview" | "playthrough";
}

function runtimeStateForGame(game: GameDefinition, initialState?: RuntimeState) {
  if (initialState?.game.metadata.id === game.metadata.id) {
    return { ...initialState, game };
  }

  return createInitialState(game);
}

function useRuntimeState(
  game: GameDefinition,
  initialState?: RuntimeState,
  onStateChange?: (state: RuntimeState) => void
) {
  const [state, setState] = useState(() => runtimeStateForGame(game, initialState));

  useEffect(() => {
    setState(runtimeStateForGame(game, initialState));
  }, [game, initialState]);

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
type TestimonyStatement = {
  id: string;
  text: string;
  speaker: string;
};

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

function dialogueBlocksBeforeHook(scene: SceneDefinition) {
  const hookIndex = scene.blocks.findIndex((block) => block.type === "gameplay_hook");
  const searchBlocks = hookIndex >= 0 ? scene.blocks.slice(0, hookIndex) : scene.blocks;
  return searchBlocks.filter((block): block is DialogueBlock => block.type === "dialogue");
}

function testimonyStatementsBeforeHook(scene: SceneDefinition, characters: Map<string, CharacterDefinition>) {
  const dialogueBlocks = dialogueBlocksBeforeHook(scene);
  const witnessBlocks = dialogueBlocks.filter((block) => {
    const character = block.characterId ? characters.get(block.characterId) : undefined;
    const roleText = `${character?.role ?? ""} ${character?.archetype ?? ""}`.toLowerCase();
    return roleText.includes("witness");
  });
  const sourceBlocks = witnessBlocks.length > 0 ? witnessBlocks : dialogueBlocks.slice(-1);

  return sourceBlocks.map((block, index): TestimonyStatement => ({
    id: `${block.characterId ?? block.speaker}-${index}`,
    text: block.text,
    speaker: block.speaker
  }));
}

function targetStatementIndex(statements: TestimonyStatement[], hook: GameplayHook) {
  if (statements.length === 0) {
    return -1;
  }

  const hint = `${hook.expectedPlayerAction ?? ""} ${hook.successCondition ?? ""}`.toLowerCase();
  const targetMatchers = [
    {
      applies: hint.includes("basement") || hint.includes("denial"),
      terms: ["below the lobby", "basement"]
    },
    {
      applies: hint.includes("window"),
      terms: ["window", "sill", "latch"]
    },
    {
      applies: hint.includes("alarm"),
      terms: ["alarm", "before"]
    }
  ];

  for (const matcher of targetMatchers) {
    if (!matcher.applies) {
      continue;
    }
    const index = statements.findIndex((statement) => {
      const text = statement.text.toLowerCase();
      return matcher.terms.some((term) => text.includes(term));
    });
    if (index >= 0) {
      return index;
    }
  }

  return statements.length - 1;
}

function pressInsight(statement: TestimonyStatement | undefined) {
  const text = statement?.text.toLowerCase() ?? "";
  if (text.includes("below the lobby") || text.includes("basement")) {
    return "The basement denial becomes the pressure point.";
  }
  if (text.includes("elevator")) {
    return "The elevator answer touches the timeline, but it is not the contradiction by itself.";
  }
  if (text.includes("alarm")) {
    return "The alarm timing matters, but Mara needs a physical record before the court will move.";
  }
  return "Mara presses for texture. The answer holds, for now.";
}

function isCourtroomHook(hook: GameplayHook) {
  return hook.type === "evidence_presentation" || hook.type === "contradiction";
}

function startInteractionLabel(hooks: GameplayHook[]) {
  const firstHook = hooks[0];
  if (!firstHook) {
    return "Review choices";
  }
  if (isCourtroomHook(firstHook)) {
    return "Start cross-examination";
  }
  if (firstHook.type === "inspection") {
    return "Start inspection";
  }
  if (firstHook.type === "timed_choice") {
    return "Start pressure choice";
  }
  if (firstHook.type === "puzzle") {
    return "Start puzzle";
  }
  return "Start gameplay";
}

function inspectionSuccessLabel(hook: GameplayHook) {
  const hint = `${hook.title ?? ""} ${hook.successCondition ?? ""} ${hook.expectedPlayerAction ?? ""}`.toLowerCase();
  if (hint.includes("stain") || hint.includes("sill")) {
    return "Mark the stain beneath the sill";
  }
  if (hint.includes("11:42") || hint.includes("row")) {
    return "Select the 11:42 row";
  }
  return "Confirm inspected detail";
}

function inspectionFailureLabel(hook: GameplayHook) {
  const hint = `${hook.title ?? ""} ${hook.failureCondition ?? ""} ${hook.expectedPlayerAction ?? ""}`.toLowerCase();
  if (hint.includes("stain") || hint.includes("sill") || hint.includes("photo")) {
    return "Tap the rain reflection";
  }
  if (hint.includes("row") || hint.includes("timestamp")) {
    return "Select an unrelated row";
  }
  return "Choose irrelevant detail";
}

function GameplayHookPanel({
  hook,
  onResolve,
  statements,
  evidenceItems,
  assets
}: {
  hook: GameplayHook;
  onResolve: (hookId: string, outcome: "success" | "failure") => void;
  statements?: TestimonyStatement[];
  evidenceItems?: ItemDefinition[];
  assets?: Map<string, AssetDefinition>;
}) {
  const testimonyStatements = statements?.length
    ? statements
    : [{ id: "statement-fallback", text: hook.successCondition || "Select the contradicted statement.", speaker: "Witness" }];
  const [activeStatementIndex, setActiveStatementIndex] = useState(0);
  const [selectedStatementIndex, setSelectedStatementIndex] = useState<number | undefined>();
  const [pressedStatementIndex, setPressedStatementIndex] = useState<number | undefined>();
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("");
  const isCrossExam = isCourtroomHook(hook);
  const isInspectionHook = hook.type === "inspection";
  const hookLabel = isCrossExam ? "Cross-Examination" : isInspectionHook ? "Inspection Mode" : "Gameplay Mode";
  const hookTitle = isCrossExam ? "Find the contradiction" : isInspectionHook ? "Photo Inspection" : hook.id;
  const hookPrompt = isCrossExam || isInspectionHook ? hook.expectedPlayerAction ?? hook.narrativePurpose ?? hook.notes : hook.gameplayPurpose ?? hook.narrativePurpose ?? hook.notes;
  const successLabel = isCrossExam ? "Present Evidence" : isInspectionHook ? inspectionSuccessLabel(hook) : "Simulate Success";
  const failureLabel = isCrossExam ? "Press Witness" : isInspectionHook ? inspectionFailureLabel(hook) : "Simulate Failure";
  const activeStatement = testimonyStatements[activeStatementIndex];
  const selectedEvidence = evidenceItems?.find((item) => item.id === selectedEvidenceId);
  const matchingStatementIndex = targetStatementIndex(testimonyStatements, hook);
  const statementMatches = !isCrossExam || selectedStatementIndex === matchingStatementIndex;
  const canPresent = !isCrossExam || (selectedStatementIndex !== undefined && Boolean(selectedEvidence));
  const requiredAssetIds = hook.assetRequirements ?? [];
  const evidenceMatches = selectedEvidence?.imageAssetId ? requiredAssetIds.includes(selectedEvidence.imageAssetId) : false;
  const presentOutcome = !isCrossExam || (statementMatches && (requiredAssetIds.length === 0 || evidenceMatches)) ? "success" : "failure";
  const inspectionAssets = requiredAssetIds.map((assetId) => assets?.get(assetId)).filter((asset): asset is AssetDefinition => Boolean(asset));

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

      {isCrossExam && (
        <div className="ak-cross-exam-module">
          <div className="ak-statement-select">
            <div className="ak-testimony-nav">
              <span className="ak-section-label">Witness Statement</span>
              <strong>
                Statement {activeStatementIndex + 1} / {testimonyStatements.length}
              </strong>
              <button
                type="button"
                disabled={activeStatementIndex === 0}
                onClick={() => setActiveStatementIndex((current) => Math.max(current - 1, 0))}
              >
                Previous statement
              </button>
              <button
                type="button"
                disabled={activeStatementIndex >= testimonyStatements.length - 1}
                onClick={() => setActiveStatementIndex((current) => Math.min(current + 1, testimonyStatements.length - 1))}
              >
                Next statement
              </button>
            </div>
            <button
              type="button"
              aria-pressed={selectedStatementIndex === activeStatementIndex}
              className={selectedStatementIndex === activeStatementIndex ? "is-selected" : ""}
              onClick={() => {
                setSelectedStatementIndex(activeStatementIndex);
              }}
            >
              {activeStatement?.text}
            </button>
            <button type="button" className="ak-press-statement" onClick={() => setPressedStatementIndex(activeStatementIndex)}>
              Press Statement
            </button>
            {pressedStatementIndex === activeStatementIndex && (
              <div className="ak-press-callout" aria-live="polite">
                <strong>HOLD IT!</strong>
                <p>{pressInsight(activeStatement)}</p>
              </div>
            )}
          </div>

          <div className="ak-evidence-select">
            <span className="ak-section-label">Select Evidence</span>
            <div>
              {evidenceItems?.map((item) => {
                const imageUrl = item.imageAssetId ? assets?.get(item.imageAssetId)?.url : "";
                return (
                  <button
                    type="button"
                    key={item.id}
                    aria-pressed={selectedEvidenceId === item.id}
                    className={selectedEvidenceId === item.id ? "is-selected" : ""}
                    onClick={() => setSelectedEvidenceId(item.id)}
                  >
                    {imageUrl && <img src={imageUrl} alt="" />}
                    <strong>{item.name}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedStatementIndex !== undefined && (
            <p className="ak-selected-evidence">Selected Statement: {selectedStatementIndex + 1}</p>
          )}
          {selectedEvidence && <p className="ak-selected-evidence">Selected Evidence: {selectedEvidence.name}</p>}
        </div>
      )}

      {isInspectionHook && (
        <div className="ak-inspection-module">
          <div className="ak-inspection-view">
            <span className="ak-section-label">Inspect Evidence</span>
            <strong>{hook.title ?? "Evidence Detail"}</strong>
            <p>{hook.gameplayPurpose ?? hook.narrativePurpose ?? hook.notes}</p>
            <div className="ak-hotspot-map" aria-hidden="true">
              <span />
            </div>
          </div>
          {inspectionAssets.length > 0 && (
            <div className="ak-inspection-assets" aria-label="Inspection assets">
              {inspectionAssets.map((asset) => (
                <div key={asset.id}>
                  {asset.url ? <img src={asset.url} alt="" /> : <span aria-hidden="true" />}
                  <strong>{asset.title}</strong>
                  <p>{asset.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="ak-hook-actions">
        <button type="button" disabled={!canPresent} onClick={() => onResolve(hook.id, presentOutcome)}>
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
      {((!isInspectionHook && hook.expectedPlayerAction) || hook.requiredInputs?.length) && (
        <div className="ak-hook-play-spec">
          {!isInspectionHook && hook.expectedPlayerAction && <span>{hook.expectedPlayerAction}</span>}
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

function impactLabel(state: RuntimeState) {
  const lastEntry = state.history[state.history.length - 1];
  if (lastEntry?.actionType !== "gameplay_hook" || lastEntry.outcome !== "success") {
    return "";
  }

  const hook = state.game.gameplayHooks.find((candidate) => candidate.id === lastEntry.actionId);
  const isCourtroomHook = hook?.type === "evidence_presentation" || hook?.type === "contradiction";
  return isCourtroomHook ? "OBJECTION!" : "";
}

export function AdventureRuntime({
  game,
  className,
  initialState,
  onStateChange,
  presentation = "preview"
}: AdventureRuntimeProps) {
  const [state, setState] = useRuntimeState(game, initialState, onStateChange);
  const [scriptCursor, setScriptCursor] = useState(0);
  const scene = getCurrentScene(state);
  const ending = getCurrentEnding(state);
  const choices = getAvailableChoices(state);
  const items = useMemo(() => itemMap(game.items), [game.items]);
  const assets = useMemo(() => assetMap(game.assets), [game.assets]);
  const characters = useMemo(() => characterMap(game.characters), [game.characters]);
  const hooks = getSceneGameplayHooks(scene, game);
  const backgroundUrl = ending ? "" : sceneBackgroundUrl(scene, game, assets);
  const sceneImpactLabel = !ending ? impactLabel(state) : "";
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
  const visibleHooks = isArtScriptComplete ? hooks : [];
  const visibleChoices = isArtScriptComplete && (!isArtScene || visibleHooks.length === 0) ? choices : [];
  const advanceLabel = safeScriptCursor < artStoryBlocks.length - 1 ? "Advance testimony" : startInteractionLabel(hooks);
  const testimonyStatements = testimonyStatementsBeforeHook(scene, characters);
  const evidenceItems = state.inventory
    .map((itemId) => items.get(itemId))
    .filter((item): item is ItemDefinition => item !== undefined && item.kind === "evidence");

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
    <div className={["ak-runtime", presentation === "playthrough" ? "ak-runtime-playthrough" : "", className].filter(Boolean).join(" ")}>
      <div className={["ak-stage", backgroundUrl ? "has-art" : ""].filter(Boolean).join(" ")}>
        {backgroundUrl ? (
          <img className="ak-scene-image" src={backgroundUrl} alt={`Scene background: ${scene.title}`} />
        ) : (
          <div className="ak-scene-backdrop" aria-hidden="true" />
        )}
        {sceneImpactLabel && <div className="ak-impact-callout" aria-live="assertive">{sceneImpactLabel}</div>}
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
              <button type="button" onClick={restart}>Restart Chapter</button>
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
                    hook ? (
                      <GameplayHookPanel
                        key={`${hook.id}-${index}`}
                        hook={hook}
                        onResolve={handleHook}
                        statements={testimonyStatements}
                        evidenceItems={evidenceItems}
                        assets={assets}
                      />
                    ) : null
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

      {presentation !== "playthrough" && (
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
      )}
    </div>
  );
}

export type { RuntimeState };
