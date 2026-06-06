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
- Court Record count
- Enter Fullscreen
- Restart Chapter
- Exit Playthrough

`Enter Fullscreen` calls the browser fullscreen API when supported. `Restart Chapter` remounts the runtime from the beginning of the selected chapter. `Exit Playthrough` returns to Studio mode.

## Layout Targets

The primary layout target is mobile landscape with a 16:9 cinematic stage. The shell also adapts to tablet and desktop by keeping the stage framed, readable, and touch-safe.

## Next Steps

The acceptance target calls for save/load or local progress persistence. The first implementation establishes the shell and restart flow. A later slice should make runtime state controllable so progress can be saved and restored from local storage.
