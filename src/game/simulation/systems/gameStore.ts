import Phaser from "phaser";
import { buildings } from "../../content/buildings";
import { factions } from "../../content/factions";
import { interactables } from "../../content/interactables";
import { questDefinitions } from "../../content/quests";
import type {
  BuildingDefinition,
  BuildingId,
  FactionDefinition,
  FactionId,
  InteractableDefinition,
  QuestDefinition,
  QuestUrgency,
} from "../../content/types";
import {
  createInitialGameState,
  hydrateGameState,
  isBuildingUnlocked,
  loadSavedGame,
  saveGameState,
} from "../state";
import type { GameState, SaveGame, UiChallenge } from "../types";

type Listener = (state: GameState) => void;

function withUnique<T>(items: T[], value: T): T[] {
  return items.includes(value) ? items : [...items, value];
}

export class GameStore {
  private state: GameState;
  private listeners = new Set<Listener>();

  constructor(initialState?: GameState) {
    this.state = initialState ?? hydrateGameState(loadSavedGame() ?? createInitialGameState());
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): GameState {
    return this.state;
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  setState(recipe: (state: GameState) => GameState): void {
    this.state = recipe(this.state);
    this.emit();
  }

  getQuestDefinitions(): QuestDefinition[] {
    return questDefinitions;
  }

  getAvailableQuests(): QuestDefinition[] {
    return questDefinitions.filter((quest) =>
      quest.prerequisites.every((flag) => this.state.flags.includes(flag)),
    );
  }

  private meetsBoardTrustRequirement(quest: QuestDefinition): boolean {
    if (!quest.boardUnlockTrust) {
      return true;
    }

    return Object.entries(quest.boardUnlockTrust).every(
      ([factionId, amount]) => this.state.reputation[factionId as FactionId] >= (amount ?? 0),
    );
  }

  getBoardQuests(): QuestDefinition[] {
    return this.getAvailableQuests().filter((quest) => {
      const progress = this.state.questProgress[quest.id];
      return progress?.status !== "available" || this.meetsBoardTrustRequirement(quest);
    });
  }

  getFilteredQuests(): QuestDefinition[] {
    const { building, urgency, tier } = this.state.ui.filters;
    return this.getBoardQuests().filter((quest) => {
      const buildingMatch = building === "all" || quest.zone === building;
      const urgencyMatch = urgency === "all" || quest.urgency === urgency;
      const tierMatch = tier === "all" || quest.tier === tier;
      return buildingMatch && urgencyMatch && tierMatch;
    });
  }

  getBuildings(): BuildingDefinition[] {
    return buildings;
  }

  getFactions(): FactionDefinition[] {
    return factions;
  }

  getCurrentFaction(): FactionId {
    return this.state.player.faction;
  }

  getCurrentFactionDefinition(): FactionDefinition {
    return factions.find((faction) => faction.id === this.state.player.faction) ?? factions[0];
  }

  getInteractablesForZone(zone: BuildingId): InteractableDefinition[] {
    return interactables.filter((interactable) => interactable.zone === zone);
  }

  selectQuest(questId: string): void {
    this.setState((state) => ({
      ...state,
      ui: { ...state.ui, selectedQuestId: questId },
    }));
  }

  updateQuestFilters(filters: Partial<GameState["ui"]["filters"]>): void {
    this.setState((state) => ({
      ...state,
      ui: { ...state.ui, filters: { ...state.ui.filters, ...filters } },
    }));
  }

  toggleQuestBoard(force?: boolean): void {
    this.setState((state) => ({
      ...state,
      ui: { ...state.ui, questBoardOpen: force ?? !state.ui.questBoardOpen },
    }));
  }

  toggleDebugPanel(force?: boolean): void {
    this.setState((state) => ({
      ...state,
      ui: { ...state.ui, debugPanelOpen: force ?? !state.ui.debugPanelOpen },
    }));
  }

  setMessage(message: string): void {
    this.setState((state) => ({
      ...state,
      ui: { ...state.ui, message },
    }));
  }

  private getQuestById(questId: string): QuestDefinition | undefined {
    return questDefinitions.find((entry) => entry.id === questId);
  }

  private getNextObjectiveLabel(questId: string, completedFlag: string): string | undefined {
    const quest = this.getQuestById(questId);
    if (!quest) {
      return undefined;
    }

    const completedIndex = quest.objectives.findIndex((objective) => objective.completionFlag === completedFlag);
    if (completedIndex === -1) {
      return quest.objectives[1]?.label ?? quest.summary;
    }

    return quest.objectives[completedIndex + 1]?.label;
  }

  acceptQuest(questId: string): void {
    const quest = this.getQuestById(questId);
    if (!quest) {
      return;
    }

    this.setState((state) => ({
      ...state,
      questProgress: {
        ...state.questProgress,
        [questId]: {
          status: "accepted",
          activeObjectiveId: quest.objectives[1]?.id ?? quest.objectives[0]?.id,
        },
      },
      flags: withUnique(state.flags, `quest:${questId}:accepted`),
      ui: {
        ...state.ui,
        selectedQuestId: questId,
        message: `${quest.title} added to your active queue.`,
        challenge: undefined,
      },
      player: {
        ...state.player,
        currentObjective: quest.objectives[1]?.label ?? quest.summary,
      },
    }));
  }

  completeObjective(flag: string, message: string): void {
    if (this.state.flags.includes(flag)) {
      this.setMessage(message);
      return;
    }

    this.setState((state) => ({
      ...state,
      flags: withUnique(state.flags, flag),
      world: {
        ...state.world,
        puzzleFlags: withUnique(state.world.puzzleFlags, flag),
      },
      ui: {
        ...state.ui,
        message,
      },
    }));
  }

  progressQuestObjective(questId: string, flag: string, message: string): void {
    if (this.state.flags.includes(flag)) {
      this.setMessage(message);
      return;
    }

    const nextObjective = this.getNextObjectiveLabel(questId, flag);

    this.setState((state) => ({
      ...state,
      flags: withUnique(state.flags, flag),
      world: {
        ...state.world,
        puzzleFlags: withUnique(state.world.puzzleFlags, flag),
      },
      questProgress: {
        ...state.questProgress,
        [questId]: {
          ...state.questProgress[questId],
          activeObjectiveId: this.getQuestById(questId)?.objectives.find((objective) => objective.label === nextObjective)?.id,
        },
      },
      player: {
        ...state.player,
        currentObjective: nextObjective ?? state.player.currentObjective,
      },
      ui: {
        ...state.ui,
        message,
        challenge: undefined,
      },
    }));
  }

  completeQuest(questId: string, completionMessage?: string): void {
    const quest = questDefinitions.find((entry) => entry.id === questId);
    if (!quest) {
      return;
    }

    const currentProgress = this.state.questProgress[questId];
    if (currentProgress?.status !== "accepted") {
      return;
    }

    this.setState((state) => {
      const updatedTools = [...state.player.tools];
      const updatedKeys = [...state.player.keys];

      for (const tool of quest.rewards.tools ?? []) {
        if (!updatedTools.includes(tool)) {
          updatedTools.push(tool);
        }
      }

      for (const key of quest.rewards.keys ?? []) {
        if (!updatedKeys.includes(key)) {
          updatedKeys.push(key);
        }
      }

      let unlockedBuildings = state.world.unlockedBuildings;
      if (quest.id === "badge-failure") {
        unlockedBuildings = withUnique(unlockedBuildings, "main-hall");
      } else if (quest.id === "archive-box-17") {
        unlockedBuildings = withUnique(unlockedBuildings, "south-hall");
      }

      const updatedReputation = { ...state.reputation };
      const factionRewards = Object.entries(quest.rewards.reputation ?? {}).map(([factionId, amount]) => ({
        factionId: factionId as FactionId,
        amount: amount ?? 0,
      }));
      for (const [factionId, amount] of Object.entries(quest.rewards.reputation ?? {})) {
        updatedReputation[factionId as FactionId] += amount ?? 0;
      }

      return {
        ...state,
        questProgress: {
          ...state.questProgress,
          [questId]: { status: "completed", activeObjectiveId: undefined },
        },
        flags: withUnique(state.flags, `quest:${questId}:completed`),
        discoveredLore: [...state.discoveredLore, ...(quest.rewards.lore ?? [])],
        reputation: updatedReputation,
        player: {
          ...state.player,
          xp: state.player.xp + quest.rewards.xp,
          tools: updatedTools,
          keys: updatedKeys,
          currentObjective:
            quest.id === "archive-box-17"
              ? "Use your visitor badge to investigate South Hall."
              : "The campus keeps getting stranger. Follow the next board signal.",
        },
        world: { ...state.world, unlockedBuildings },
        ui: {
          ...state.ui,
          message: completionMessage ?? `${quest.title} completed. Rewards issued to your campus profile.`,
          lastCompletedQuest: {
            questId: quest.id,
            title: quest.title,
            xpEarned: quest.rewards.xp,
            factionRewards,
            toolsEarned: quest.rewards.tools ?? [],
            keysEarned: quest.rewards.keys ?? [],
            loreUnlocked: quest.rewards.lore ?? [],
          },
          challenge: undefined,
        },
      };
    });
  }

  movePlayer(deltaX: number, deltaY: number): void {
    this.setState((state) => ({
      ...state,
      player: {
        ...state.player,
        position: {
          x: Phaser.Math.Clamp(state.player.position.x + deltaX, 40, 1160),
          y: Phaser.Math.Clamp(state.player.position.y + deltaY, 40, 680),
        },
      },
    }));
  }

  applyHazardImpact(position: { x: number; y: number }, message: string): void {
    this.setState((state) => ({
      ...state,
      player: {
        ...state.player,
        energy: Math.max(0, state.player.energy - 1),
        position,
      },
      ui: {
        ...state.ui,
        message,
      },
    }));
  }

  setPlayerLocation(location: BuildingId, position?: { x: number; y: number }): void {
    const archiveRoomAvailable =
      location === "north-hall-archive-room" &&
      (this.state.flags.includes("quest:archive-box-17:accepted") ||
        this.state.flags.includes("quest:archive-box-17:box-recovered") ||
        this.state.flags.includes("quest:archive-box-17:completed"));

    if (!archiveRoomAvailable && !isBuildingUnlocked(this.state, location)) {
      this.setMessage(`Access to ${location} is still sealed behind a campus mystery.`);
      return;
    }

    this.setState((state) => ({
      ...state,
      player: { ...state.player, location, position: position ?? state.player.position },
      world: {
        ...state.world,
        unlockedBuildings: archiveRoomAvailable
          ? withUnique(state.world.unlockedBuildings, "north-hall-archive-room")
          : state.world.unlockedBuildings,
      },
      ui: {
        ...state.ui,
        message: `Entered ${buildings.find((building) => building.id === location)?.name ?? location}.`,
      },
    }));
  }

  unlockBuilding(buildingId: BuildingId): void {
    this.setState((state) => ({
      ...state,
      world: {
        ...state.world,
        unlockedBuildings: withUnique(state.world.unlockedBuildings, buildingId),
      },
    }));
  }

  hasTool(toolId: string): boolean {
    return this.state.player.tools.includes(toolId) || this.state.player.keys.includes(toolId);
  }

  setSelectedFaction(factionId: FactionId): void {
    this.setState((state) => ({
      ...state,
      player: { ...state.player, faction: factionId },
      ui: {
        ...state.ui,
        message: `${factions.find((faction) => faction.id === factionId)?.name ?? factionId} role selected. Trust and quest options may shift with it.`,
      },
    }));
  }

  save(): void {
    saveGameState(this.state);
    this.setMessage("Campus state archived to local storage.");
  }

  reset(): void {
    const resetState = createInitialGameState();
    this.state = resetState;
    saveGameState(resetState);
    this.emit();
  }

  importSave(saveData: SaveGame): void {
    this.state = hydrateGameState(saveData);
    this.emit();
  }

  setUrgencyFilter(value: QuestUrgency | "all"): void {
    this.updateQuestFilters({ urgency: value });
  }

  openChallenge(challenge: UiChallenge): void {
    this.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        challenge,
      },
    }));
  }

  closeChallenge(): void {
    this.setState((state) => ({
      ...state,
      ui: {
        ...state.ui,
        challenge: undefined,
      },
    }));
  }

  submitChallengeAnswer(answer: string): void {
    const challenge = this.state.ui.challenge;
    if (!challenge) {
      return;
    }
    const faction = this.state.player.faction;

    if (challenge.type === "ada-puzzle") {
      const acceptedAnswers = new Set<string>([
        "Bernoulli Numbers",
        ...(faction === "archivists" ? ["Cross-reference the accession note to Lovelace's Bernoulli work"] : []),
        ...(faction === "it-operations" ? ["Trace the algorithm target: Bernoulli Numbers"] : []),
      ]);
      if (acceptedAnswers.has(answer)) {
        this.progressQuestObjective(
          "archive-box-17",
          "quest:archive-box-17:box-recovered",
          faction === "archivists"
            ? "Your archival instinct pays off. The accession note points back to Ada's Bernoulli-number work, and the latch opens like a file finally agreeing to be found."
            : faction === "it-operations"
              ? "You treat the note like a debug trace, follow the target correctly, and pop the latch. Ada's algorithm points to Bernoulli numbers."
              : "Ada's note clicks the hidden latch: her published algorithm targeted Bernoulli numbers. Archive Box 17 is yours.",
        );
        return;
      }
      this.setMessage("The latch rejects that answer. Ada would prefer the sequence from her famous published algorithm.");
      return;
    }

    if (challenge.type === "disturbance-choice") {
      const acceptedAnswers = new Set<string>([
        "Ask them to reconstruct the rumor as a campus quest",
        ...(faction === "student-residents" ? ["Offer to map the rumor chain floor by floor"] : []),
        ...(faction === "archivists" ? ["Ask them to document the tape as living campus folklore"] : []),
      ]);
      if (acceptedAnswers.has(answer)) {
        this.progressQuestObjective(
          "north-hall-disturbance",
          "quest:north-hall-disturbance:resolved",
          faction === "student-residents"
            ? "You speak dorm fluently: once the rumor becomes a floor-by-floor story map, the fight burns out and turns into shared gossip logistics. Rae should hear this."
            : faction === "archivists"
              ? "Framing the tape as campus folklore changes the tone instantly. The residents stop fighting and start preserving the story. Rae should hear this."
              : "The floor calms down once the story gets reframed as a shared quest instead of a shared accusation. Rae should hear this.",
        );
        return;
      }
      this.setMessage("That response only escalates the dorm folklore. Try a choice that redirects the energy instead of winning the argument.");
      return;
    }

    if (challenge.type === "badge-reset") {
      const acceptedAnswers = new Set<string>([
        "UPS -> Badge Controller -> Door Node",
        ...(faction === "facilities" ? ["Stabilize power, then controller, then field hardware"] : []),
        ...(faction === "administrators" ? ["Validate power approval, then controller authority, then endpoint access"] : []),
        ...(faction === "it-operations" ? ["UPS -> Badge Controller -> Door Node"] : []),
      ]);
      if (acceptedAnswers.has(answer)) {
        this.progressQuestObjective(
          "badge-failure",
          "quest:badge-failure:rack-reset",
          faction === "facilities"
            ? "You approach the rack like infrastructure, not drama: stabilize power, bring the controller back, then restore the endpoint. South Hall stops fighting its own doors. Now audit the console."
            : faction === "administrators"
              ? "Your bureaucratic brain actually helps here: power authorization first, controller authority second, endpoint access last. The locks settle. Now audit the console."
              : "You reset the stack in the right order: power, controller, node. South Hall stops arguing with its own locks. Now audit the console for root cause.",
        );
        return;
      }
      this.setMessage("That order leaves the controller sulking. Start with power, then the control layer, then the endpoint.");
    }
  }

  isObjectiveComplete(flag?: string): boolean {
    return Boolean(flag && this.state.flags.includes(flag));
  }
}
