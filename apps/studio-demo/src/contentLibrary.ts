import { formatValidationErrors, validateGame } from "@adventurekit/core";
import type { GameDefinition, ValidationError } from "@adventurekit/core";

const gameModules = import.meta.glob("../../../content/*/game.json", {
  eager: true,
  import: "default"
}) as Record<string, unknown>;

const flagshipGameId = "the-last-testimony";

export interface LoadedGame {
  path: string;
  game: GameDefinition;
}

export interface ContentLibrary {
  games: LoadedGame[];
  errors: ValidationError[];
  formattedErrors: string;
}

export function loadContentLibrary(): ContentLibrary {
  const games: LoadedGame[] = [];
  const errors: ValidationError[] = [];

  for (const [path, moduleValue] of Object.entries(gameModules)) {
    const result = validateGame(moduleValue, path);
    if (result.ok) {
      games.push({ path, game: result.game });
    } else {
      errors.push(...result.errors);
    }
  }

  games.sort((a, b) => {
    if (a.game.metadata.id === flagshipGameId) {
      return -1;
    }
    if (b.game.metadata.id === flagshipGameId) {
      return 1;
    }
    return a.game.metadata.title.localeCompare(b.game.metadata.title);
  });

  return {
    games,
    errors,
    formattedErrors: formatValidationErrors(errors)
  };
}
