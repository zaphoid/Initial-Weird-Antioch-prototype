export type QuestUrgency = "routine" | "moderate" | "urgent" | "paranormal";
export type QuestTier = "early" | "mid" | "late" | "story";
export type BuildingId = "campus" | "library" | "north-hall" | "north-hall-archive-room" | "south-hall" | "main-hall";
export type FactionId =
  | "it-operations"
  | "facilities"
  | "student-residents"
  | "administrators"
  | "archivists";

export interface ObjectiveDefinition {
  id: string;
  label: string;
  completionFlag?: string;
  requiredTool?: string;
}

export interface RewardDefinition {
  xp: number;
  reputation?: Partial<Record<FactionId, number>>;
  keys?: string[];
  tools?: string[];
  lore?: string[];
}

export interface QuestDefinition {
  id: string;
  title: string;
  summary: string;
  giver: string;
  zone: BuildingId;
  objectives: ObjectiveDefinition[];
  rewards: RewardDefinition;
  prerequisites: string[];
  urgency: QuestUrgency;
  tier: QuestTier;
  tags: string[];
  storyCritical: boolean;
  preferredResolution: "combat" | "puzzle" | "stealth" | "dialogue" | "mixed";
  boardUnlockTrust?: Partial<Record<FactionId, number>>;
  focusSplit: {
    itLearning: number;
    fun: number;
    antiochLore: number;
  };
}

export interface BuildingDefinition {
  id: BuildingId;
  name: string;
  tone: string;
  accessRequirements: string[];
  npcGroups: string[];
  interactables: string[];
  secrets: string[];
  fastTravelLinks: BuildingId[];
}

export interface FactionDefinition {
  id: FactionId;
  name: string;
  startingFlavor: string;
  perks: string[];
  questAffinity: string[];
}

export interface InteractableDefinition {
  id: string;
  label: string;
  zone: BuildingId;
  type: "terminal" | "door" | "archive-box" | "mixer" | "server-rack" | "prop" | "switch" | "rumor-node";
  requiredFlags?: string[];
  requiredTools?: string[];
  onInteractText: string;
}
