import type { BuildingId, FactionId, QuestUrgency } from "../content/types";
import type { GameState, SaveGame } from "./types";

export const SAVE_KEY = "weird-antioch-save";

const defaultReputation: Record<FactionId, number> = {
  "it-operations": 1,
  facilities: 0,
  "student-residents": 0,
  administrators: 0,
  archivists: 0,
};

export function createInitialGameState(): GameState {
  return {
    player: {
      name: "Campus Troubleshooter",
      faction: "it-operations",
      health: 5,
      energy: 5,
      level: 1,
      xp: 0,
      tools: ["network-toolkit"],
      keys: [],
      currentObjective: "Check the quest board in the Library.",
      location: "library",
      position: { x: 540, y: 320 },
    },
    questProgress: {
      "archive-box-17": { status: "available" },
      "badge-failure": { status: "available" },
      "north-hall-disturbance": { status: "available" },
    },
    reputation: defaultReputation,
    flags: [],
    discoveredLore: [],
    debugEnabled: true,
    ui: {
      questBoardOpen: false,
      debugPanelOpen: false,
      selectedQuestId: "archive-box-17",
      filters: { building: "all", urgency: "all", tier: "all" },
      message: "You clock in beneath the humming quest board. Antioch is normal for at least another minute.",
      lastCompletedQuest: undefined,
      challenge: undefined,
    },
    world: {
      unlockedBuildings: ["campus", "library", "north-hall"],
      puzzleFlags: [],
      npcProgression: {},
      eventTriggers: [],
    },
  };
}

export function isBuildingUnlocked(state: GameState, buildingId: BuildingId): boolean {
  return state.world.unlockedBuildings.includes(buildingId);
}

export function saveGameState(state: GameState): void {
  const saveData: SaveGame = {
    player: state.player,
    questProgress: state.questProgress,
    reputation: state.reputation,
    flags: state.flags,
    discoveredLore: state.discoveredLore,
    world: state.world,
  };

  window.localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
}

export function loadSavedGame(): SaveGame | null {
  const raw = window.localStorage.getItem(SAVE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SaveGame;
  } catch {
    return null;
  }
}

export function hydrateGameState(saveData: SaveGame): GameState {
  const base = createInitialGameState();
  return {
    ...base,
    player: saveData.player,
    questProgress: saveData.questProgress,
    reputation: saveData.reputation,
    flags: saveData.flags,
    discoveredLore: saveData.discoveredLore,
    world: saveData.world,
  };
}

export function colorLabelForUrgency(urgency: QuestUrgency): string {
  return urgency;
}
