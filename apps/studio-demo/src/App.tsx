import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CheckCircle2,
  Clipboard,
  Download,
  Film,
  Image,
  ListTree,
  Maximize2,
  Monitor,
  Play as PlayIcon,
  RotateCcw,
  Settings,
  Smartphone,
  Sparkles,
  Tablet,
  UserRound,
  Wand2,
  Workflow,
  X
} from "lucide-react";
import {
  createInitialState,
  createExportPackage,
  formatValidationErrors,
  validateGame
} from "@adventurekit/core";
import type {
  AssetDefinition,
  CharacterDefinition,
  GameDefinition,
  GameplayHook,
  RuntimeState,
  SceneDefinition,
  ValidationError
} from "@adventurekit/core";
import { AdventureRuntime } from "@adventurekit/react-runtime";
import { buildAgentPayload, runAgentBridge } from "./agentBridge";
import type { AgentActionId, AgentBridgeSettings, AgentPromptPayload } from "./agentBridge";
import { loadContentLibrary } from "./contentLibrary";
import "./styles.css";

type AppMode = "studio" | "play" | "chapter";
type StudioTab = "overview" | "scenes" | "characters" | "assets" | "hooks" | "bible" | "export" | "settings";
type PreviewMode = "mobile-landscape" | "mobile-portrait" | "tablet" | "desktop";
type IconComponent = typeof Smartphone;
type SceneChoice = NonNullable<SceneDefinition["choices"]>[number];
type ChoiceEffect = NonNullable<SceneChoice["effects"]>[number];
type ChoiceTarget = SceneChoice["target"];

const previewModes: Array<{
  id: PreviewMode;
  label: string;
  title: string;
  Icon: IconComponent;
}> = [
  {
    id: "mobile-landscape",
    label: "Mobile Landscape",
    title: "Preview mobile landscape",
    Icon: Smartphone
  },
  {
    id: "mobile-portrait",
    label: "Mobile Portrait",
    title: "Preview mobile portrait",
    Icon: RotateCcw
  },
  {
    id: "tablet",
    label: "Tablet",
    title: "Preview tablet",
    Icon: Tablet
  },
  {
    id: "desktop",
    label: "Desktop",
    title: "Preview desktop",
    Icon: Monitor
  }
];

const studioTabs: Array<{
  id: StudioTab;
  label: string;
  Icon: IconComponent;
}> = [
  { id: "overview", label: "Chapter Overview", Icon: ListTree },
  { id: "scenes", label: "Scenes", Icon: Film },
  { id: "characters", label: "Characters", Icon: UserRound },
  { id: "assets", label: "Assets", Icon: Image },
  { id: "hooks", label: "Gameplay Hooks", Icon: Workflow },
  { id: "bible", label: "Story Bible", Icon: BookOpen },
  { id: "export", label: "Export", Icon: Download },
  { id: "settings", label: "Settings", Icon: Settings }
];

const flagshipGameId = "the-last-testimony";
const chapterSaveVersion = 1;

type ChapterProgressSnapshot = {
  version: typeof chapterSaveVersion;
  gameId: string;
  currentSceneId: string;
  variables: RuntimeState["variables"];
  inventory: string[];
  endingId?: string;
  history: RuntimeState["history"];
  savedAt: string;
};

type RestoredChapterProgress = {
  state: RuntimeState;
  savedAt: string;
};

function chapterSaveKey(game: GameDefinition) {
  return `lorecraft:chapter-progress:${game.metadata.id}:v${chapterSaveVersion}`;
}

function canUseLocalStorage() {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVariableValue(value: unknown): value is RuntimeState["variables"][string] {
  return value === null || ["boolean", "number", "string"].includes(typeof value);
}

function restoredVariables(game: GameDefinition, candidate: unknown) {
  const variables = { ...createInitialState(game).variables };
  if (!isRecord(candidate)) {
    return variables;
  }

  Object.entries(candidate).forEach(([key, value]) => {
    if (Object.prototype.hasOwnProperty.call(variables, key) && isVariableValue(value)) {
      variables[key] = value;
    }
  });

  return variables;
}

function restoredInventory(game: GameDefinition, candidate: unknown) {
  const itemIds = new Set(game.items.map((item) => item.id));
  const inventory = new Set(createInitialState(game).inventory);
  if (!Array.isArray(candidate)) {
    return Array.from(inventory);
  }

  candidate.forEach((itemId) => {
    if (typeof itemId === "string" && itemIds.has(itemId)) {
      inventory.add(itemId);
    }
  });

  return Array.from(inventory);
}

function restoredHistoryEntry(
  candidate: unknown,
  sceneIds: Set<string>,
  endingIds: Set<string>
): RuntimeState["history"][number] | undefined {
  if (!isRecord(candidate) || typeof candidate.fromSceneId !== "string" || !sceneIds.has(candidate.fromSceneId)) {
    return undefined;
  }
  if (typeof candidate.actionId !== "string") {
    return undefined;
  }
  if (candidate.actionType !== "choice" && candidate.actionType !== "gameplay_hook") {
    return undefined;
  }
  if (candidate.toSceneId !== undefined && (typeof candidate.toSceneId !== "string" || !sceneIds.has(candidate.toSceneId))) {
    return undefined;
  }
  if (candidate.endingId !== undefined && (typeof candidate.endingId !== "string" || !endingIds.has(candidate.endingId))) {
    return undefined;
  }
  if (candidate.outcome !== undefined && candidate.outcome !== "success" && candidate.outcome !== "failure") {
    return undefined;
  }

  return {
    fromSceneId: candidate.fromSceneId,
    toSceneId: typeof candidate.toSceneId === "string" ? candidate.toSceneId : undefined,
    endingId: typeof candidate.endingId === "string" ? candidate.endingId : undefined,
    actionId: candidate.actionId,
    actionType: candidate.actionType,
    outcome: candidate.outcome === "success" || candidate.outcome === "failure" ? candidate.outcome : undefined
  };
}

function restoredHistory(game: GameDefinition, candidate: unknown) {
  if (!Array.isArray(candidate)) {
    return [];
  }

  const sceneIds = new Set(game.scenes.map((scene) => scene.id));
  const endingIds = new Set(game.endings.map((ending) => ending.id));
  return candidate
    .map((entry) => restoredHistoryEntry(entry, sceneIds, endingIds))
    .filter((entry): entry is RuntimeState["history"][number] => Boolean(entry));
}

function shouldPersistChapterProgress(state: RuntimeState) {
  return Boolean(state.endingId || state.history.length > 0 || state.currentSceneId !== state.game.startScene);
}

function loadChapterProgress(game: GameDefinition): RestoredChapterProgress | undefined {
  if (!canUseLocalStorage()) {
    return undefined;
  }

  try {
    const saved = window.localStorage.getItem(chapterSaveKey(game));
    if (!saved) {
      return undefined;
    }

    const parsed: unknown = JSON.parse(saved);
    if (
      !isRecord(parsed)
      || parsed.version !== chapterSaveVersion
      || parsed.gameId !== game.metadata.id
      || typeof parsed.currentSceneId !== "string"
      || !game.scenes.some((scene) => scene.id === parsed.currentSceneId)
    ) {
      return undefined;
    }

    const endingId = typeof parsed.endingId === "string" && game.endings.some((ending) => ending.id === parsed.endingId)
      ? parsed.endingId
      : undefined;
    const state: RuntimeState = {
      ...createInitialState(game),
      currentSceneId: parsed.currentSceneId,
      variables: restoredVariables(game, parsed.variables),
      inventory: restoredInventory(game, parsed.inventory),
      endingId,
      history: restoredHistory(game, parsed.history)
    };

    if (!shouldPersistChapterProgress(state)) {
      return undefined;
    }

    return {
      state,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : ""
    };
  } catch {
    return undefined;
  }
}

function saveChapterProgress(state: RuntimeState) {
  if (!canUseLocalStorage() || !shouldPersistChapterProgress(state)) {
    return undefined;
  }

  const savedAt = new Date().toISOString();
  const snapshot: ChapterProgressSnapshot = {
    version: chapterSaveVersion,
    gameId: state.game.metadata.id,
    currentSceneId: state.currentSceneId,
    variables: state.variables,
    inventory: state.inventory,
    endingId: state.endingId,
    history: state.history,
    savedAt
  };
  window.localStorage.setItem(chapterSaveKey(state.game), JSON.stringify(snapshot));

  return savedAt;
}

function clearChapterProgress(game: GameDefinition) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(chapterSaveKey(game));
}

const sceneAgentActions: Array<{
  action: AgentActionId;
  label: string;
  Icon: IconComponent;
}> = [
  { action: "improve_scene", label: "Generate/Improve Scene Draft", Icon: Wand2 },
  { action: "generate_background_prompt", label: "Generate Background Prompt", Icon: Image },
  { action: "generate_character_sheet", label: "Generate Character Direction", Icon: UserRound },
  { action: "cinematic_polish_pass", label: "Generate Cinematic Polish", Icon: Sparkles }
];

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function initialGameMap(games: Array<{ game: GameDefinition }>) {
  return Object.fromEntries(games.map(({ game }) => [game.metadata.id, game])) as Record<string, GameDefinition>;
}

function firstId<T extends { id: string }>(items: T[]) {
  return items[0]?.id ?? "";
}

function formatErrors(errors: ValidationError[]) {
  return errors.length > 0 ? formatValidationErrors(errors) : "No validation errors.";
}

function targetSummary(game: GameDefinition, target: ChoiceTarget) {
  if (target.type === "ending") {
    return `ending: ${target.id}`;
  }

  const scene = game.scenes.find((candidate) => candidate.id === target.id);
  return `scene: ${scene?.title ?? target.id}`;
}

function hookFromSceneBlock(game: GameDefinition, block: SceneDefinition["blocks"][number]) {
  if (block.type !== "gameplay_hook") {
    return undefined;
  }

  return block.hook ?? game.gameplayHooks.find((hook) => hook.id === block.hookId);
}

function gameplaySequencesFor(game: GameDefinition) {
  return game.scenes.flatMap((scene) =>
    scene.blocks
      .map((block) => {
        const hook = hookFromSceneBlock(game, block);
        return hook ? { scene, hook } : undefined;
      })
      .filter((entry): entry is { scene: SceneDefinition; hook: GameplayHook } => Boolean(entry))
  );
}

function branchingChoicesFor(game: GameDefinition) {
  return game.scenes.flatMap((scene) =>
    (scene.choices ?? [])
      .filter((choice) => choice.conditions?.length || choice.effects?.length || choice.target.type === "ending")
      .map((choice) => ({ scene, choice }))
  );
}

function choiceEffectSummary(effect: ChoiceEffect) {
  switch (effect.type) {
    case "setVariable":
      return `${effect.variable} = ${String(effect.value)}`;
    case "incrementVariable":
      return `${effect.variable} ${effect.by >= 0 ? "+" : ""}${effect.by}`;
    case "addItem":
      return `add ${effect.itemId}`;
    case "removeItem":
      return `remove ${effect.itemId}`;
  }
}

function ScenePreview({ scene }: { scene: SceneDefinition }) {
  return (
    <section className="scene-preview" aria-label="Studio scene preview">
      <span className="scene-preview-label">{scene.location ?? "scene"}</span>
      <strong className="scene-preview-title">{scene.title}</strong>
      <p>{scene.background}</p>
      <div className="scene-preview-chips">
        {scene.mood.map((mood) => <span key={mood}>{mood}</span>)}
      </div>
      <div className="scene-preview-script">
        {scene.blocks.slice(0, 3).map((block, index) => {
          if (block.type === "dialogue") {
            return <span key={`${block.type}-${index}`}><b>{block.speaker}</b> {block.text}</span>;
          }
          if (block.type === "narration") {
            return <span key={`${block.type}-${index}`}>{block.text}</span>;
          }
          return <span key={`${block.type}-${index}`}>Hook: {block.hookId ?? block.hook?.id}</span>;
        })}
      </div>
    </section>
  );
}

function ChapterPlaythrough({ game, onExit }: { game: GameDefinition; onExit: () => void }) {
  const gameViewportRef = useRef<HTMLDivElement>(null);
  const [restoredProgress, setRestoredProgress] = useState(() => loadChapterProgress(game));
  const [showBriefing, setShowBriefing] = useState(() => !restoredProgress);
  const [runtimeState, setRuntimeState] = useState<RuntimeState | undefined>(() => restoredProgress?.state);
  const [saveStatusAt, setSaveStatusAt] = useState(restoredProgress?.savedAt);
  const [restartKey, setRestartKey] = useState(0);
  const currentScene = game.scenes.find((scene) => scene.id === runtimeState?.currentSceneId) ?? game.scenes.find((scene) => scene.id === game.startScene) ?? game.scenes[0];
  const currentSceneIndex = currentScene ? game.scenes.findIndex((scene) => scene.id === currentScene.id) : -1;
  const chapterProgress = currentSceneIndex >= 0 ? Math.round(((currentSceneIndex + 1) / game.scenes.length) * 100) : 0;
  const objective = runtimeState?.endingId
    ? "Review the chapter outcome."
    : showBriefing
      ? "Read the case and begin the final testimony."
    : currentScene?.purpose ?? currentScene?.synopsis ?? "Advance the chapter.";
  const evidenceCount = runtimeState?.inventory.length ?? game.items.filter((item) => item.initiallyOwned).length;
  const hasSavedProgress = Boolean(saveStatusAt && runtimeState && shouldPersistChapterProgress(runtimeState));

  const handleRuntimeStateChange = useCallback((nextState: RuntimeState) => {
    setRuntimeState(nextState);
    setSaveStatusAt(saveChapterProgress(nextState));
  }, []);

  function restartChapter() {
    clearChapterProgress(game);
    setRestoredProgress(undefined);
    setShowBriefing(true);
    setRuntimeState(undefined);
    setSaveStatusAt(undefined);
    setRestartKey((current) => current + 1);
  }

  async function enterFullscreen() {
    if (!document.fullscreenElement && gameViewportRef.current?.requestFullscreen) {
      await gameViewportRef.current.requestFullscreen();
    }
  }

  return (
    <main className="chapter-playthrough-shell">
      <section
        ref={gameViewportRef}
        className={[
          "chapter-game-viewport",
          hasSavedProgress ? "has-save-status" : "",
          showBriefing ? "is-briefing" : ""
        ].filter(Boolean).join(" ")}
        aria-label="The Last Testimony game viewport"
      >
        <header className="chapter-hud" aria-label="Chapter playthrough controls">
          <div className="chapter-title-lockup">
            <span>Chapter 1</span>
            <h1>{game.metadata.title}</h1>
            <p>Chapter 1 Playthrough</p>
          </div>

          <div className="chapter-hud-status" aria-label="Chapter state">
            <div className="chapter-hud-panel" aria-label="Current chapter objective">
              <span>Objective</span>
              <strong>{objective}</strong>
            </div>

            <div className="chapter-progress" aria-label="Chapter progress">
              <span>Progress</span>
              <strong>{chapterProgress}%</strong>
              <div aria-hidden="true"><span style={{ width: `${chapterProgress}%` }} /></div>
            </div>

            {hasSavedProgress && (
              <div className="chapter-hud-panel chapter-save-status" aria-label="Local save status">
                <span>Saved Progress</span>
                <strong>{currentScene?.title ?? "Chapter progress"}</strong>
              </div>
            )}

            <div className="chapter-record-pill" aria-label="Court Record count">
              <span>Court Record</span>
              <strong>{evidenceCount}</strong>
            </div>
          </div>

          <div className="chapter-hud-actions">
            <button type="button" onClick={enterFullscreen}>
              <Maximize2 aria-hidden="true" />
              <span>Enter Fullscreen</span>
            </button>
            <button type="button" onClick={restartChapter}>
              <RotateCcw aria-hidden="true" />
              <span>Restart Chapter</span>
            </button>
            <button type="button" onClick={onExit}>
              <X aria-hidden="true" />
              <span>Exit Playthrough</span>
            </button>
          </div>
        </header>

        <div className="chapter-stage">
          {showBriefing ? (
            <ChapterBriefing game={game} onBegin={() => setShowBriefing(false)} />
          ) : (
            <AdventureRuntime
              key={`${game.metadata.id}-${restartKey}`}
              game={game}
              initialState={restoredProgress?.state}
              onStateChange={handleRuntimeStateChange}
              presentation="playthrough"
            />
          )}
        </div>
      </section>
    </main>
  );
}

function ChapterBriefing({ game, onBegin }: { game: GameDefinition; onBegin: () => void }) {
  const startingEvidence = game.items.filter((item) => item.initiallyOwned && item.kind === "evidence");
  const assets = new Map(game.assets.map((asset) => [asset.id, asset]));
  const characterById = new Map(game.characters.map((character) => [character.id, character]));
  const cast = [
    { id: "mara_vey", role: "Defense", className: "is-mara" },
    { id: "elias_vorn", role: "Accused", className: "is-elias" },
    { id: "lyra_mont", role: "Witness", className: "is-lyra" }
  ]
    .map((entry) => {
      const character = characterById.get(entry.id);
      return character?.portraitUrl ? { ...entry, character } : undefined;
    })
    .filter((entry): entry is { id: string; role: string; className: string; character: CharacterDefinition } => Boolean(entry));

  return (
    <section className="chapter-briefing" aria-label="Case briefing">
      <img className="chapter-briefing-art" src="/story-assets/last-testimony/courtroom-predawn.png" alt="" />
      <div className="chapter-briefing-cast" aria-label="Opening cast">
        {cast.map((entry) => (
          <figure key={entry.id} className={entry.className}>
            <img src={entry.character.portraitUrl} alt={entry.character.displayName} />
            <figcaption>
              <span>{entry.role}</span>
              <strong>{entry.character.displayName}</strong>
            </figcaption>
          </figure>
        ))}
      </div>

      {startingEvidence.length > 0 && (
        <div className="chapter-briefing-record" aria-label="Opening court record">
          <span>Opening Court Record</span>
          <div>
            {startingEvidence.map((item) => {
              const asset = item.imageAssetId ? assets.get(item.imageAssetId) : undefined;
              return (
                <strong key={item.id}>
                  {asset?.url && <img src={asset.url} alt="" />}
                  {item.name}
                </strong>
              );
            })}
          </div>
        </div>
      )}

      <div className="chapter-briefing-panel">
        <span className="chapter-briefing-kicker">Predawn Courtroom / Final Testimony</span>
        <h2>The Last Testimony</h2>
        <p className="chapter-briefing-lede">
          Elias Vorn will be convicted at dawn unless Mara breaks the last witness account before the judge ends the trial.
        </p>
        <p>
          You play Mara Vey. Read the testimony, inspect the physical record, and present the contradiction hidden in Lyra's story.
        </p>

        <div className="chapter-briefing-directive">
          <BookOpen aria-hidden="true" />
          <strong>Opening move: prove the window was staged.</strong>
        </div>

        <button type="button" onClick={onBegin}>
          <PlayIcon aria-hidden="true" />
          <span>Begin final testimony</span>
        </button>
      </div>
    </section>
  );
}

function App() {
  const library = useMemo(() => loadContentLibrary(), []);
  const [draftGames, setDraftGames] = useState(() => initialGameMap(library.games));
  const [selectedGameId, setSelectedGameId] = useState(() => (
    library.games.find(({ game }) => game.metadata.id === flagshipGameId)?.game.metadata.id
      ?? library.games[0]?.game.metadata.id
      ?? ""
  ));
  const [mode, setMode] = useState<AppMode>("studio");
  const [activeTab, setActiveTab] = useState<StudioTab>("scenes");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile-landscape");
  const [selectedSceneId, setSelectedSceneId] = useState(() => library.games[0]?.game.startScene ?? "");
  const [selectedCharacterId, setSelectedCharacterId] = useState(() => firstId(library.games[0]?.game.characters ?? []));
  const [selectedAssetId, setSelectedAssetId] = useState(() => firstId(library.games[0]?.game.assets ?? []));
  const [selectedHookId, setSelectedHookId] = useState(() => firstId(library.games[0]?.game.gameplayHooks ?? []));
  const [selectedExportFile, setSelectedExportFile] = useState("game.json");
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [agentSettings, setAgentSettings] = useState<AgentBridgeSettings>({
    endpointUrl: "",
    providerLabel: "Local agent",
    applyMode: "review"
  });
  const [agentModal, setAgentModal] = useState<AgentPromptPayload | null>(null);
  const [agentResponse, setAgentResponse] = useState("");

  const orderedGames = useMemo(() => library.games.map(({ path, game }) => ({
    path,
    game: draftGames[game.metadata.id] ?? game
  })), [draftGames, library.games]);

  const selectedGame = draftGames[selectedGameId];
  const selectedScene = selectedGame?.scenes.find((scene) => scene.id === selectedSceneId) ?? selectedGame?.scenes[0];
  const selectedCharacter = selectedGame?.characters.find((character) => character.id === selectedCharacterId) ?? selectedGame?.characters[0];
  const selectedAsset = selectedGame?.assets.find((asset) => asset.id === selectedAssetId) ?? selectedGame?.assets[0];
  const selectedHook = selectedGame?.gameplayHooks.find((hook) => hook.id === selectedHookId) ?? selectedGame?.gameplayHooks[0];
  const exportPackage = useMemo(
    () => selectedGame ? createExportPackage(selectedGame, "local-preview") : undefined,
    [selectedGame]
  );
  const exportFiles = Object.keys(exportPackage?.files ?? {});
  const selectedExportContent = exportPackage?.files[selectedExportFile] ?? "";

  useEffect(() => {
    if (!selectedGame) {
      return;
    }

    if (!selectedGame.scenes.some((scene) => scene.id === selectedSceneId)) {
      setSelectedSceneId(selectedGame.startScene);
    }
    if (!selectedGame.characters.some((character) => character.id === selectedCharacterId)) {
      setSelectedCharacterId(firstId(selectedGame.characters));
    }
    if (!selectedGame.assets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(firstId(selectedGame.assets));
    }
    if (!selectedGame.gameplayHooks.some((hook) => hook.id === selectedHookId)) {
      setSelectedHookId(firstId(selectedGame.gameplayHooks));
    }
  }, [selectedAssetId, selectedCharacterId, selectedGame, selectedHookId, selectedSceneId]);

  useEffect(() => {
    if (exportPackage && !exportPackage.files[selectedExportFile]) {
      setSelectedExportFile("game.json");
    }
  }, [exportPackage, selectedExportFile]);

  function updateSelectedGame(updater: (game: GameDefinition) => GameDefinition) {
    setDraftGames((current) => {
      const game = current[selectedGameId];
      if (!game) {
        return current;
      }
      return {
        ...current,
        [selectedGameId]: updater(game)
      };
    });
  }

  function updateScene(patch: Partial<SceneDefinition>) {
    updateSelectedGame((game) => ({
      ...game,
      scenes: game.scenes.map((scene) => scene.id === selectedSceneId ? { ...scene, ...patch } : scene)
    }));
  }

  function updateCharacter(patch: Partial<CharacterDefinition>) {
    updateSelectedGame((game) => ({
      ...game,
      characters: game.characters.map((character) => character.id === selectedCharacterId ? { ...character, ...patch } : character)
    }));
  }

  function updateAsset(patch: Partial<AssetDefinition>) {
    updateSelectedGame((game) => ({
      ...game,
      assets: game.assets.map((asset) => asset.id === selectedAssetId ? { ...asset, ...patch } : asset)
    }));
  }

  function updateHook(patch: Partial<GameplayHook>) {
    updateSelectedGame((game) => ({
      ...game,
      gameplayHooks: game.gameplayHooks.map((hook) => hook.id === selectedHookId ? { ...hook, ...patch } : hook)
    }));
  }

  function updateStoryBible(patch: Partial<NonNullable<GameDefinition["storyBible"]>>) {
    updateSelectedGame((game) => game.storyBible ? ({
      ...game,
      storyBible: { ...game.storyBible, ...patch }
    }) : game);
  }

  function validateSelectedProject() {
    if (!selectedGame) {
      return;
    }
    const result = validateGame(selectedGame, selectedGame.metadata.id);
    setValidationErrors(result.ok ? [] : result.errors);
  }

  async function runSceneAgentAction(action: AgentActionId) {
    if (!selectedGame) {
      return;
    }

    const result = await runAgentBridge(action, agentSettings, {
      game: selectedGame,
      scene: selectedScene,
      character: selectedCharacter,
      hook: selectedHook
    });
    setAgentResponse(result.status === "response" ? result.text : "");
    setAgentModal(result.payload);
  }

  function showPromptFor(action: AgentActionId) {
    if (!selectedGame) {
      return;
    }
    setAgentResponse("");
    setAgentModal(buildAgentPayload(action, agentSettings, {
      game: selectedGame,
      scene: selectedScene,
      character: selectedCharacter,
      hook: selectedHook
    }));
  }

  function renderOverviewPanel() {
    if (!selectedGame) {
      return null;
    }

    const sequences = gameplaySequencesFor(selectedGame);
    const evidenceItems = selectedGame.items.filter((item) => item.kind === "evidence");
    const branchingChoices = branchingChoicesFor(selectedGame);
    const validationResult = validateGame(selectedGame, selectedGame.metadata.id);
    const validationIssues = validationResult.ok ? [] : validationResult.errors;
    const readyAssets = selectedGame.assets.filter((asset) =>
      asset.status === "approved" || asset.status === "generated" || Boolean(asset.url)
    );
    const promptedAssets = selectedGame.assets.filter((asset) => asset.status === "prompted");
    const neededAssets = selectedGame.assets.filter((asset) => asset.status === "needed");

    return (
      <section className="editor-surface chapter-overview-panel" aria-label="Chapter overview">
        <div className="panel-heading-row">
          <div>
            <span className="kicker">Flagship Production Map</span>
            <h2>Chapter Overview</h2>
            <p className="overview-lede">{selectedGame.metadata.summary}</p>
          </div>
          <button type="button" className="overview-reference-button" onClick={validateSelectedProject}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Run Reference Check</span>
          </button>
        </div>

        <div className="overview-stat-grid">
          <div>
            <span>Scenes</span>
            <strong>{selectedGame.scenes.length}</strong>
            <p>{selectedGame.startScene}</p>
          </div>
          <div>
            <span>Gameplay</span>
            <strong>{sequences.length}</strong>
            <p>{selectedGame.storyBible?.gameplayModulePlan.join(" / ")}</p>
          </div>
          <div>
            <span>Evidence</span>
            <strong>{evidenceItems.length}</strong>
            <p>{selectedGame.items.filter((item) => item.initiallyOwned).length} initially owned</p>
          </div>
          <div>
            <span>Endings</span>
            <strong>{selectedGame.endings.length}</strong>
            <p>{branchingChoices.length} branching points</p>
          </div>
        </div>

        <div className="overview-grid">
          <section className="overview-section overview-section-wide">
            <header>
              <span>Story Beats</span>
              <strong>{selectedGame.storyBible?.chapterOutline.join(" -> ")}</strong>
            </header>
            <ol className="overview-timeline">
              {selectedGame.scenes.map((scene, index) => (
                <li key={scene.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{scene.title}</strong>
                    <p>{scene.purpose ?? scene.synopsis ?? scene.background}</p>
                    <small>{[scene.location, scene.transition, scene.camera].filter(Boolean).join(" / ")}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="overview-section">
            <header>
              <span>Gameplay Sequences</span>
              <strong>{sequences.length} playable hooks</strong>
            </header>
            <ul className="overview-list">
              {sequences.map(({ scene, hook }) => (
                <li key={`${scene.id}-${hook.id}`}>
                  <strong>{hook.id}</strong>
                  <p>{hook.title ?? hook.narrativePurpose ?? hook.notes}</p>
                  <small>{hook.type} in {scene.title}</small>
                  <small>Success: {targetSummary(selectedGame, hook.successTarget)}</small>
                  <small>Failure: {targetSummary(selectedGame, hook.failureTarget)}</small>
                </li>
              ))}
            </ul>
          </section>

          <section className="overview-section">
            <header>
              <span>Evidence Chain</span>
              <strong>{evidenceItems.length} court record items</strong>
            </header>
            <ul className="overview-list">
              {evidenceItems.map((item) => {
                const asset = item.imageAssetId ? selectedGame.assets.find((candidate) => candidate.id === item.imageAssetId) : undefined;
                return (
                  <li key={item.id}>
                    <strong>{item.name}</strong>
                    <p>{item.description}</p>
                    <small>{item.id}{asset ? ` / ${asset.status}` : ""}</small>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="overview-section">
            <header>
              <span>Branching Points</span>
              <strong>{branchingChoices.length} state-aware choices</strong>
            </header>
            <ul className="overview-list">
              {branchingChoices.map(({ scene, choice }) => (
                <li key={`${scene.id}-${choice.id}`}>
                  <strong>{choice.label}</strong>
                  <p>{scene.title}{" -> "}{targetSummary(selectedGame, choice.target)}</p>
                  <small>{choice.effects?.map(choiceEffectSummary).join(" / ") || "conditional branch"}</small>
                </li>
              ))}
            </ul>
          </section>

          <section className="overview-section">
            <header>
              <span>Chapter Outcomes</span>
              <strong>{selectedGame.endings.length} possible results</strong>
            </header>
            <ul className="overview-list">
              {selectedGame.endings.map((ending) => (
                <li key={ending.id}>
                  <strong>{ending.id}</strong>
                  <p>{ending.title}</p>
                  <small>{ending.tone}</small>
                </li>
              ))}
            </ul>
          </section>

          <section className="overview-section">
            <header>
              <span>Reference Check</span>
              <strong>{validationIssues.length === 0 ? "Clean" : `${validationIssues.length} issues`}</strong>
            </header>
            {validationIssues.length === 0 ? (
              <p className="overview-ok">No broken references.</p>
            ) : (
              <pre className="validation-output">{formatValidationErrors(validationIssues)}</pre>
            )}
          </section>

          <section className="overview-section">
            <header>
              <span>Asset Readiness</span>
              <strong>{readyAssets.length} ready / {selectedGame.assets.length} total</strong>
            </header>
            <dl className="overview-readiness">
              <div><dt>Generated or approved</dt><dd>{readyAssets.length}</dd></div>
              <div><dt>Prompted</dt><dd>{promptedAssets.length}</dd></div>
              <div><dt>Needed</dt><dd>{neededAssets.length}</dd></div>
            </dl>
            <ul className="overview-list compact">
              {selectedGame.assets.slice(0, 6).map((asset) => (
                <li key={asset.id}>
                  <strong>{asset.title}</strong>
                  <small>{asset.type} / {asset.status} / {asset.aspectRatio}</small>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </section>
    );
  }

  function renderScenePanel() {
    if (!selectedScene || !selectedGame) {
      return null;
    }

    return (
      <section className="editor-surface">
        <div className="panel-heading-row">
          <div>
            <span className="kicker">Studio Mode</span>
            <h2>Scene Editor</h2>
          </div>
          <label className="inline-select">
            <span>Scene</span>
            <select value={selectedScene.id} onChange={(event) => setSelectedSceneId(event.target.value)}>
              {selectedGame.scenes.map((scene) => (
                <option key={scene.id} value={scene.id}>{scene.title}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="agent-action-row">
          {sceneAgentActions.map(({ action, label, Icon }) => (
            <button key={action} type="button" onClick={() => runSceneAgentAction(action)}>
              <Icon size={16} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
          <button type="button" onClick={validateSelectedProject}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Validate Scene</span>
          </button>
        </div>

        <div className="field-grid">
          <label>
            <span>Title</span>
            <input value={selectedScene.title} onChange={(event) => updateScene({ title: event.target.value })} />
          </label>
          <label>
            <span>Purpose</span>
            <input value={selectedScene.purpose ?? ""} onChange={(event) => updateScene({ purpose: event.target.value })} />
          </label>
          <label>
            <span>Location</span>
            <input value={selectedScene.location ?? ""} onChange={(event) => updateScene({ location: event.target.value })} />
          </label>
          <label>
            <span>Camera</span>
            <input value={selectedScene.camera ?? ""} onChange={(event) => updateScene({ camera: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Synopsis</span>
            <textarea value={selectedScene.synopsis ?? ""} onChange={(event) => updateScene({ synopsis: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Background</span>
            <textarea value={selectedScene.background} onChange={(event) => updateScene({ background: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Background Prompt</span>
            <textarea value={selectedScene.backgroundPrompt ?? ""} onChange={(event) => updateScene({ backgroundPrompt: event.target.value })} />
          </label>
          <label>
            <span>Mood Tags</span>
            <input value={selectedScene.mood.join(", ")} onChange={(event) => updateScene({ mood: splitList(event.target.value) })} />
          </label>
          <label>
            <span>Asset IDs</span>
            <input value={selectedScene.assetIds?.join(", ") ?? ""} onChange={(event) => updateScene({ assetIds: splitList(event.target.value) })} />
          </label>
          <label className="wide-field">
            <span>Mobile Landscape Notes</span>
            <textarea
              value={selectedScene.layoutNotes?.mobileLandscape ?? ""}
              onChange={(event) => updateScene({
                layoutNotes: {
                  ...selectedScene.layoutNotes,
                  mobileLandscape: event.target.value
                }
              })}
            />
          </label>
        </div>

        {validationErrors.length > 0 && (
          <pre className="validation-output" aria-live="polite">{formatErrors(validationErrors)}</pre>
        )}
      </section>
    );
  }

  function renderCharacterPanel() {
    if (!selectedGame || !selectedCharacter) {
      return null;
    }

    return (
      <section className="editor-surface">
        <div className="panel-heading-row">
          <div>
            <span className="kicker">Cast</span>
            <h2>Character Editor</h2>
          </div>
          <label className="inline-select">
            <span>Character</span>
            <select value={selectedCharacter.id} onChange={(event) => setSelectedCharacterId(event.target.value)}>
              {selectedGame.characters.map((character) => (
                <option key={character.id} value={character.id}>{character.displayName}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-grid">
          <label>
            <span>Display Name</span>
            <input value={selectedCharacter.displayName} onChange={(event) => updateCharacter({ displayName: event.target.value })} />
          </label>
          <label>
            <span>Role</span>
            <input value={selectedCharacter.role} onChange={(event) => updateCharacter({ role: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Visual Description</span>
            <textarea value={selectedCharacter.visualDescription} onChange={(event) => updateCharacter({ visualDescription: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Base Image Prompt</span>
            <textarea value={selectedCharacter.baseImagePrompt} onChange={(event) => updateCharacter({ baseImagePrompt: event.target.value })} />
          </label>
          <label>
            <span>Emotions</span>
            <input value={selectedCharacter.emotions.join(", ")} onChange={(event) => updateCharacter({ emotions: splitList(event.target.value) })} />
          </label>
          <label>
            <span>Stances</span>
            <input value={selectedCharacter.stances.join(", ")} onChange={(event) => updateCharacter({ stances: splitList(event.target.value) })} />
          </label>
        </div>
        <div className="mini-list">
          {selectedCharacter.variants.map((variant) => (
            <article key={`${variant.emotionId}-${variant.stanceId}`}>
              <strong>{variant.emotionId} / {variant.stanceId}</strong>
              <span>{variant.animation ?? "no animation"}</span>
              <p>{variant.imagePrompt}</p>
            </article>
          ))}
        </div>
      </section>
    );
  }

  function renderAssetPanel() {
    if (!selectedGame || !selectedAsset) {
      return null;
    }

    return (
      <section className="editor-surface">
        <div className="panel-heading-row">
          <div>
            <span className="kicker">Prompts</span>
            <h2>Asset Prompt Manager</h2>
          </div>
          <label className="inline-select">
            <span>Asset</span>
            <select value={selectedAsset.id} onChange={(event) => setSelectedAssetId(event.target.value)}>
              {selectedGame.assets.map((asset) => (
                <option key={asset.id} value={asset.id}>{asset.title}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-grid">
          <label>
            <span>Title</span>
            <input value={selectedAsset.title} onChange={(event) => updateAsset({ title: event.target.value })} />
          </label>
          <label>
            <span>Status</span>
            <select value={selectedAsset.status} onChange={(event) => updateAsset({ status: event.target.value as AssetDefinition["status"] })}>
              {["needed", "prompted", "generated", "approved", "replaced"].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="wide-field">
            <span>Description</span>
            <textarea value={selectedAsset.description} onChange={(event) => updateAsset({ description: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Prompt</span>
            <textarea value={selectedAsset.prompt} onChange={(event) => updateAsset({ prompt: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Negative Prompt</span>
            <textarea value={selectedAsset.negativePrompt ?? ""} onChange={(event) => updateAsset({ negativePrompt: event.target.value })} />
          </label>
        </div>
      </section>
    );
  }

  function renderHookPanel() {
    if (!selectedGame || !selectedHook) {
      return null;
    }

    return (
      <section className="editor-surface">
        <div className="panel-heading-row">
          <div>
            <span className="kicker">Modules</span>
            <h2>Gameplay Hook Manager</h2>
          </div>
          <label className="inline-select">
            <span>Hook</span>
            <select value={selectedHook.id} onChange={(event) => setSelectedHookId(event.target.value)}>
              {selectedGame.gameplayHooks.map((hook) => (
                <option key={hook.id} value={hook.id}>{hook.title ?? hook.id}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="field-grid">
          <label>
            <span>Title</span>
            <input value={selectedHook.title ?? ""} onChange={(event) => updateHook({ title: event.target.value })} />
          </label>
          <label>
            <span>Future Module</span>
            <input value={selectedHook.futureModuleType ?? selectedHook.module} onChange={(event) => updateHook({ futureModuleType: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Narrative Purpose</span>
            <textarea value={selectedHook.narrativePurpose ?? ""} onChange={(event) => updateHook({ narrativePurpose: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Expected Player Action</span>
            <textarea value={selectedHook.expectedPlayerAction ?? ""} onChange={(event) => updateHook({ expectedPlayerAction: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Mobile Layout Notes</span>
            <textarea value={selectedHook.uiLayoutNotes ?? ""} onChange={(event) => updateHook({ uiLayoutNotes: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Agent Prompt</span>
            <textarea value={selectedHook.agentPrompt ?? ""} onChange={(event) => updateHook({ agentPrompt: event.target.value })} />
          </label>
        </div>
      </section>
    );
  }

  function renderBiblePanel() {
    const bible = selectedGame?.storyBible;
    if (!bible) {
      return null;
    }

    return (
      <section className="editor-surface">
        <div className="panel-heading-row">
          <div>
            <span className="kicker">Canon</span>
            <h2>Story Bible</h2>
          </div>
        </div>
        <div className="field-grid">
          <label className="wide-field">
            <span>Premise</span>
            <textarea value={bible.premise} onChange={(event) => updateStoryBible({ premise: event.target.value })} />
          </label>
          <label>
            <span>Tone</span>
            <input value={bible.tone} onChange={(event) => updateStoryBible({ tone: event.target.value })} />
          </label>
          <label>
            <span>Target Play Style</span>
            <input value={bible.targetPlayStyle} onChange={(event) => updateStoryBible({ targetPlayStyle: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Visual Direction</span>
            <textarea value={bible.visualDirection} onChange={(event) => updateStoryBible({ visualDirection: event.target.value })} />
          </label>
          <label className="wide-field">
            <span>Writing Style Guide</span>
            <textarea value={bible.writingStyleGuide} onChange={(event) => updateStoryBible({ writingStyleGuide: event.target.value })} />
          </label>
        </div>
      </section>
    );
  }

  function renderExportPanel() {
    return (
      <section className="editor-surface">
        <div className="panel-heading-row">
          <div>
            <span className="kicker">Package</span>
            <h2>Export Package</h2>
          </div>
        </div>
        <div className="export-layout">
          <div className="export-file-list">
            {exportFiles.map((file) => (
              <button key={file} type="button" className={selectedExportFile === file ? "is-active" : ""} onClick={() => setSelectedExportFile(file)}>
                <Archive size={15} aria-hidden="true" />
                <span>{file}</span>
              </button>
            ))}
          </div>
          <textarea className="export-content" value={selectedExportContent} readOnly />
        </div>
      </section>
    );
  }

  function renderSettingsPanel() {
    return (
      <section className="editor-surface">
        <div className="panel-heading-row">
          <div>
            <span className="kicker">Bridge</span>
            <h2>Local Agent Bridge</h2>
          </div>
        </div>
        <div className="field-grid">
          <label>
            <span>Endpoint URL</span>
            <input value={agentSettings.endpointUrl} onChange={(event) => setAgentSettings({ ...agentSettings, endpointUrl: event.target.value })} placeholder="http://127.0.0.1:8787/adventurekit" />
          </label>
          <label>
            <span>Provider Label</span>
            <input value={agentSettings.providerLabel} onChange={(event) => setAgentSettings({ ...agentSettings, providerLabel: event.target.value })} />
          </label>
          <label>
            <span>Apply Mode</span>
            <select value={agentSettings.applyMode} onChange={(event) => setAgentSettings({ ...agentSettings, applyMode: event.target.value as AgentBridgeSettings["applyMode"] })}>
              <option value="review">Review before apply</option>
              <option value="auto-apply">Auto-apply response</option>
            </select>
          </label>
          <div className="action-stack">
            <button type="button" onClick={() => showPromptFor("generate_dialogue")}>
              <Clipboard size={16} aria-hidden="true" />
              <span>generate_dialogue</span>
            </button>
            <button type="button" onClick={() => showPromptFor("expand_story_branch")}>
              <Clipboard size={16} aria-hidden="true" />
              <span>expand_story_branch</span>
            </button>
            <button type="button" onClick={() => showPromptFor("generate_gameplay_hook_spec")}>
              <Clipboard size={16} aria-hidden="true" />
              <span>generate_gameplay_hook_spec</span>
            </button>
          </div>
        </div>
      </section>
    );
  }

  function renderActivePanel() {
    switch (activeTab) {
      case "overview":
        return renderOverviewPanel();
      case "characters":
        return renderCharacterPanel();
      case "assets":
        return renderAssetPanel();
      case "hooks":
        return renderHookPanel();
      case "bible":
        return renderBiblePanel();
      case "export":
        return renderExportPanel();
      case "settings":
        return renderSettingsPanel();
      case "scenes":
      default:
        return renderScenePanel();
    }
  }

  return (
    mode === "chapter" && selectedGame ? (
      <ChapterPlaythrough game={selectedGame} onExit={() => setMode("studio")} />
    ) : (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">LS</span>
          <div>
            <h1>Lorecraft Studio</h1>
            <p>Agent-friendly cinematic story studio</p>
          </div>
        </div>

        <div className="topbar-actions">
          <div className="mode-switch" aria-label="Mode switch">
            <button type="button" className={mode === "studio" ? "is-active" : ""} onClick={() => setMode("studio")} aria-pressed={mode === "studio"}>
              <Film size={16} aria-hidden="true" />
              <span>Studio</span>
            </button>
            <button type="button" className={mode === "play" ? "is-active" : ""} onClick={() => setMode("play")} aria-pressed={mode === "play"}>
              <PlayIcon size={16} aria-hidden="true" />
              <span>Play</span>
            </button>
          </div>
          <button type="button" className="play-chapter-button" onClick={() => setMode("chapter")}>
            <PlayIcon size={16} aria-hidden="true" />
            <span>Play Chapter</span>
          </button>

          <label className="game-picker" htmlFor="project-select">
            <span>Project</span>
            <select id="project-select" value={selectedGameId} onChange={(event) => setSelectedGameId(event.target.value)}>
            {orderedGames.map(({ game }) => (
              <option key={game.metadata.id} value={game.metadata.id}>
                {game.metadata.title}
              </option>
            ))}
            </select>
          </label>
        </div>
      </header>

      {library.errors.length > 0 && (
        <section className="validation-banner" aria-live="polite">
          <AlertTriangle size={18} aria-hidden="true" />
          <pre>{library.formattedErrors}</pre>
        </section>
      )}

      <section className="preview-toolbar" aria-label="Preview controls">
        {previewModes.map(({ id, label, title, Icon }) => (
          <button
            key={id}
            type="button"
            className={previewMode === id ? "is-active" : ""}
            onClick={() => setPreviewMode(id)}
            title={title}
            aria-pressed={previewMode === id}
          >
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </section>

      {selectedGame && mode === "studio" && (
        <section className="studio-workbench" aria-label="Lorecraft Studio">
          <aside className="project-rail" aria-label="Studio navigation">
            <div className="project-summary">
              {selectedGame.metadata.id === flagshipGameId && <em>Flagship Chapter 1</em>}
              <span>{selectedGame.metadata.genre}</span>
              <strong>{selectedGame.metadata.title}</strong>
              <p>{selectedGame.metadata.summary}</p>
              <dl>
                <div><dt>Scenes</dt><dd>{selectedGame.scenes.length}</dd></div>
                <div><dt>Cast</dt><dd>{selectedGame.characters.length}</dd></div>
                <div><dt>Hooks</dt><dd>{selectedGame.gameplayHooks.length}</dd></div>
              </dl>
            </div>
            <nav className="studio-nav" aria-label="Studio sections">
              {studioTabs.map(({ id, label, Icon }) => (
                <button key={id} type="button" className={activeTab === id ? "is-active" : ""} onClick={() => setActiveTab(id)}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <div className="editor-column">
            {renderActivePanel()}
          </div>

          {selectedScene && (
            <aside className={`studio-preview mode-${previewMode}`} aria-label="Responsive studio preview">
              <div className="preview-device">
                <ScenePreview scene={selectedScene} />
              </div>
            </aside>
          )}
        </section>
      )}

      {mode === "play" && (
        <section className={`preview-wrap mode-${previewMode}`} aria-label={`${previewMode} preview`}>
          <div className="preview-device">
            {previewMode === "mobile-portrait" && (
              <div className="portrait-note">Portrait fallback keeps the project stacked and touch-safe.</div>
            )}
            {selectedGame ? (
              <AdventureRuntime key={selectedGame.metadata.id} game={selectedGame} />
            ) : (
              <div className="empty-library">
                <h2>No playable projects found.</h2>
                <p>Add a valid game file under content/name/game.json.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {agentModal && (
        <div className="modal-backdrop">
          <section className="agent-modal" role="dialog" aria-modal="true" aria-labelledby="agent-prompt-title">
            <div className="panel-heading-row">
              <div>
                <span className="kicker">{agentModal.providerLabel}</span>
                <h2 id="agent-prompt-title">Local Agent Prompt</h2>
              </div>
              <button type="button" className="icon-button" onClick={() => setAgentModal(null)} aria-label="Dismiss prompt">
                <RotateCcw size={17} aria-hidden="true" />
              </button>
            </div>
            <div className="prompt-meta">
              <span>{agentModal.action}</span>
              <span>{agentModal.applyMode}</span>
            </div>
            <textarea value={agentModal.prompt} readOnly />
            {agentResponse && <pre className="agent-response">{agentResponse}</pre>}
            <button type="button" className="primary-action" onClick={() => setAgentModal(null)}>Close prompt</button>
          </section>
        </div>
      )}
    </main>
    )
  );
}

export default App;
