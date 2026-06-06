# Fullscreen Playthrough

Lorecraft Studio includes a dedicated Chapter playthrough mode for The Last Testimony.

## Launching

1. Run `npm run dev`.
2. Open Lorecraft Studio.
3. Keep The Last Testimony selected in the Project picker.
4. Press `Play Chapter`.

The Studio topbar, editor panels, and preview controls are hidden. The player sees a focused playthrough shell with the cinematic runtime.

## Playthrough HUD

The current shell shows:

- chapter title
- current objective
- chapter progress
- local saved-progress status
- Court Record count
- Enter Fullscreen
- Restart Chapter
- Exit Playthrough

`Enter Fullscreen` calls the browser fullscreen API when supported. `Restart Chapter` clears the local chapter save and remounts the runtime from the beginning of the selected chapter. `Exit Playthrough` returns to Studio mode without clearing progress.

## Local Progress

Chapter progress is saved to browser local storage after the runtime moves beyond the opening state. The save uses a versioned, project-specific key and stores only the current scene, variables, evidence inventory, ending, and history. When `Play Chapter` is opened again, Lorecraft Studio restores that snapshot if it still matches the current project content.

## Layout Targets

The primary layout target is mobile landscape with a 16:9 cinematic stage. The shell also adapts to tablet and desktop by keeping the stage framed, readable, and touch-safe.
