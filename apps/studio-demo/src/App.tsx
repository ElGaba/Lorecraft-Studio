import { useMemo, useState } from "react";
import { AlertTriangle, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react";
import { AdventureRuntime } from "@adventurekit/react-runtime";
import { loadContentLibrary } from "./contentLibrary";
import "./styles.css";

type PreviewMode = "mobile-landscape" | "mobile-portrait" | "tablet" | "desktop";

const previewModes: Array<{
  id: PreviewMode;
  label: string;
  title: string;
  Icon: typeof Smartphone;
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

function App() {
  const library = useMemo(() => loadContentLibrary(), []);
  const [selectedGameId, setSelectedGameId] = useState(() => library.games[0]?.game.metadata.id ?? "");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile-landscape");
  const selectedGame = library.games.find(({ game }) => game.metadata.id === selectedGameId)?.game;

  return (
    <main className="studio-shell">
      <header className="studio-topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">AK</span>
          <div>
            <h1>AdventureKit</h1>
            <p>Agent-first cinematic narrative prototype engine</p>
          </div>
        </div>

        <label className="game-picker">
          <span>Prototype</span>
          <select value={selectedGameId} onChange={(event) => setSelectedGameId(event.target.value)}>
            {library.games.map(({ game }) => (
              <option key={game.metadata.id} value={game.metadata.id}>
                {game.metadata.title}
              </option>
            ))}
          </select>
        </label>
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

      <section className={`preview-wrap mode-${previewMode}`} aria-label={`${previewMode} preview`}>
        <div className="preview-device">
          {previewMode === "mobile-portrait" && (
            <div className="portrait-note">Portrait fallback keeps the prototype stacked and touch-safe.</div>
          )}
          {selectedGame ? (
            <AdventureRuntime key={selectedGame.metadata.id} game={selectedGame} />
          ) : (
            <div className="empty-library">
              <h2>No playable prototypes found.</h2>
              <p>Add a valid game file under content/name/game.json.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
