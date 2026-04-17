import type { BuildingId, FactionId, QuestUrgency } from "../content/types";

export interface PlayerState {
  name: string;
  faction: FactionId;
  health: number;
  energy: number;
  level: number;
  xp: number;
  tools: string[];
  keys: string[];
  currentObjective: string;
  location: BuildingId;
  position: { x: number; y: number };
}

export interface QuestProgress {
  status: "available" | "accepted" | "completed";
  activeObjectiveId?: string;
}

export interface WorldState {
  unlockedBuildings: BuildingId[];
  puzzleFlags: string[];
  npcProgression: Record<string, number>;
  eventTriggers: string[];
}

export interface QuestCompletionSummary {
  questId: string;
  title: string;
  xpEarned: number;
  factionRewards: Array<{ factionId: FactionId; amount: number }>;
  toolsEarned: string[];
  keysEarned: string[];
  loreUnlocked: string[];
}

export interface QuestFilterState {
  building: BuildingId | "all";
  urgency: QuestUrgency | "all";
  tier: "all" | "early" | "mid" | "late" | "story";
}

export type UiChallenge =
  | {
      type: "ada-puzzle";
      questId: string;
      title: string;
      description: string;
      factionFlavor?: string;
      options: string[];
    }
  | {
      type: "disturbance-choice";
      questId: string;
      title: string;
      description: string;
      factionFlavor?: string;
      options: string[];
    }
  | {
      type: "badge-reset";
      questId: string;
      title: string;
      description: string;
      factionFlavor?: string;
      options: string[];
    };

export interface GameState {
  player: PlayerState;
  questProgress: Record<string, QuestProgress>;
  reputation: Record<FactionId, number>;
  flags: string[];
  discoveredLore: string[];
  debugEnabled: boolean;
  ui: {
    questBoardOpen: boolean;
    debugPanelOpen: boolean;
    selectedQuestId?: string;
    filters: QuestFilterState;
    message: string;
    lastCompletedQuest?: QuestCompletionSummary;
    challenge?: UiChallenge;
  };
  world: WorldState;
}

export interface SaveGame {
  player: PlayerState;
  questProgress: Record<string, QuestProgress>;
  reputation: Record<FactionId, number>;
  flags: string[];
  discoveredLore: string[];
  world: WorldState;
}
