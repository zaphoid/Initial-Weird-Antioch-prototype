import Phaser from "phaser";
import type { BuildingId, FactionId, QuestDefinition, QuestTier, QuestUrgency } from "../game/content/types";
import { GameStore } from "../game/simulation/systems/gameStore";
import { colorLabelForUrgency } from "../game/simulation/state";
import type { GameState } from "../game/simulation/types";
import { BootScene } from "../phaser/scenes/BootScene";
import { GameplayScene } from "../phaser/scenes/GameplayScene";

function optionList<T extends string>(values: readonly T[], selected: T): string {
  return values
    .map((value) => `<option value="${value}" ${selected === value ? "selected" : ""}>${labelize(value)}</option>`)
    .join("");
}

function labelize(value: string): string {
  return value.replaceAll("-", " ").replace(/\b\w/g, (char: string) => char.toUpperCase());
}

export function mountGameApp(root: HTMLDivElement): void {
  const store = new GameStore();

  root.innerHTML = `
    <div class="game-shell">
      <div id="game-canvas" class="game-canvas"></div>
      <div id="hud-root" class="hud-root"></div>
    </div>
  `;

  const hudRoot = root.querySelector<HTMLDivElement>("#hud-root")!;
  const canvasRoot = root.querySelector<HTMLDivElement>("#game-canvas")!;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: canvasRoot,
    width: 1200,
    height: 720,
    backgroundColor: "#10212a",
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
      },
    },
    scene: [new BootScene(), new GameplayScene(store)],
  });

  const unsubscribe = store.subscribe((state) => {
    renderHud(hudRoot, state, store);
  });

  window.addEventListener("beforeunload", () => {
    unsubscribe();
    game.destroy(true);
  });
}

function renderHud(root: HTMLDivElement, state: GameState, store: GameStore): void {
  const boardVisible = state.ui.questBoardOpen;
  const quests = boardVisible ? store.getFilteredQuests() : [];
  const allVisibleQuests = store.getAvailableQuests();
  const activeCount = allVisibleQuests.filter((quest) => state.questProgress[quest.id]?.status === "accepted").length;
  const completedCount = allVisibleQuests.filter((quest) => state.questProgress[quest.id]?.status === "completed").length;
  const selectedQuest =
    quests.find((quest) => quest.id === state.ui.selectedQuestId) ??
    store.getQuestDefinitions().find((quest) => quest.id === state.ui.selectedQuestId) ??
    quests[0];

  root.innerHTML = `
    <section class="panel top-left">
      <div class="panel-header">
        <h2 class="panel-title">Operator Status</h2>
        <span class="badge">${labelize(state.player.faction)}</span>
      </div>
        <div class="stats-grid">
        <div class="stat-card"><div class="label">Location</div><div class="value">${labelize(state.player.location)}</div></div>
        <div class="stat-card"><div class="label">Objective</div><div class="value">${state.player.currentObjective}</div></div>
        <div class="stat-card"><div class="label">Health</div><div class="value">${state.player.health}/5</div></div>
        <div class="stat-card"><div class="label">Energy</div><div class="value">${state.player.energy}/5</div></div>
        <div class="stat-card"><div class="label">XP</div><div class="value">${state.player.xp}</div></div>
        <div class="stat-card"><div class="label">Unlocked Zones</div><div class="value">${state.world.unlockedBuildings.map(labelize).join(", ")}</div></div>
        <div class="stat-card"><div class="label">Active Quests</div><div class="value">${activeCount}</div></div>
        <div class="stat-card"><div class="label">Completed</div><div class="value">${completedCount}</div></div>
      </div>
        <div class="overlay-block">
          <h3>Faction Standing</h3>
          <div class="quick-grid">
            ${store
              .getFactions()
              .map(
                (faction) => `<span class="chip">${faction.name}: ${state.reputation[faction.id]}</span>`,
              )
              .join("")}
          </div>
        </div>
      <div class="overlay-block">
        <h3>Faction Lens</h3>
        <div class="faction-list">
          ${store
            .getFactions()
            .map(
              (faction) => `
                <div class="faction-card">
                  <div class="panel-header">
                    <strong>${faction.name}</strong>
                    <button data-action="set-faction" data-faction="${faction.id}">${state.player.faction === faction.id ? "Active" : "Switch"}</button>
                  </div>
                  <div class="label">${faction.startingFlavor}</div>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="panel top-right">
      <div class="panel-header">
        <h2 class="panel-title">Quest Board</h2>
        <span class="badge">${boardVisible ? `${quests.length} visible` : "hidden"}</span>
      </div>
      <div class="filter-row">
        <select data-filter="building">${optionList(["all", "library", "north-hall", "south-hall", "main-hall"] as const, state.ui.filters.building)}</select>
        <select data-filter="urgency">${optionList(["all", "routine", "moderate", "urgent", "paranormal"] as const, state.ui.filters.urgency)}</select>
        <select data-filter="tier">${optionList(["all", "early", "mid", "late", "story"] as const, state.ui.filters.tier)}</select>
      </div>
      <div class="quest-list">
        ${boardVisible
          ? quests
              .map((quest) => {
                const progress = state.questProgress[quest.id];
                return `
                  <button class="quest-card" data-action="select-quest" data-quest="${quest.id}">
                    <strong>${quest.title}</strong>
                    <div>${quest.summary}</div>
                    <div class="quest-meta">
                      <span class="chip">${labelize(quest.zone)}</span>
                      <span class="chip urgent-${colorLabelForUrgency(quest.urgency)}">${labelize(quest.urgency)}</span>
                      <span class="chip">${labelize(quest.tier)}</span>
                      <span class="chip">${progress?.status === "completed" ? "[DONE]" : progress?.status ?? "available"}</span>
                    </div>
                  </button>
                `;
              })
              .join("")
          : `<p class="empty">Press Q or use the button below to reopen the board.</p>`}
      </div>
      <div class="overlay-block">
        ${
          selectedQuest
            ? `
              <h3>${selectedQuest.title}</h3>
              <p>${selectedQuest.summary}</p>
              <p><strong>Giver:</strong> ${selectedQuest.giver}</p>
              <p><strong>Preferred resolution:</strong> ${labelize(selectedQuest.preferredResolution)}</p>
              <p><strong>Quest mix:</strong> ${selectedQuest.focusSplit.itLearning}% IT learning / ${selectedQuest.focusSplit.fun}% fun / ${selectedQuest.focusSplit.antiochLore}% Antioch lore</p>
              <p><strong>Rewards:</strong> ${selectedQuest.rewards.xp} XP${renderRewardSummary(selectedQuest)}</p>
              <div class="objective-list">
                ${selectedQuest.objectives
                  .map((objective) => `
                    <div class="objective-row ${objective.completionFlag && store.isObjectiveComplete(objective.completionFlag) ? "objective-complete" : ""}">
                      <span>${objective.completionFlag && store.isObjectiveComplete(objective.completionFlag) ? "✓" : "○"}</span>
                      <span>${objective.label}</span>
                    </div>
                  `)
                  .join("")}
              </div>
              <div class="button-row">
                <button class="button-primary" data-action="accept-selected">Accept / Track</button>
                <button data-action="toggle-board">${state.ui.questBoardOpen ? "Hide Board" : "Show Board"}</button>
              </div>
            `
            : `<p class="empty">No quest matches the current filters.</p>`
        }
      </div>
    </section>

    <section class="bottom-bar">
      <div class="panel">
        <div class="panel-header"><h2 class="panel-title">Tools & Keys</h2></div>
        <div class="quick-grid">
          ${state.player.tools.map((tool) => `<span class="chip">${labelize(tool)}</span>`).join("")}
          ${state.player.keys.map((key) => `<span class="chip">${labelize(key)}</span>`).join("")}
        </div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2 class="panel-title">Mission Complete</h2></div>
        ${
          state.ui.lastCompletedQuest
            ? `
              <div><strong>${state.ui.lastCompletedQuest.title}</strong></div>
              <div class="label">+${state.ui.lastCompletedQuest.xpEarned} XP awarded</div>
              <div class="quick-grid" style="margin-top:10px;">
                ${state.ui.lastCompletedQuest.factionRewards.map((reward) => `<span class="chip">${labelize(reward.factionId)} +${reward.amount}</span>`).join("")}
                ${state.ui.lastCompletedQuest.toolsEarned.map((tool) => `<span class="chip">${labelize(tool)}</span>`).join("")}
                ${state.ui.lastCompletedQuest.keysEarned.map((key) => `<span class="chip">${labelize(key)}</span>`).join("")}
              </div>
            `
            : `<div>No quest turn-in yet. Rewards will land here with XP and faction gains.</div>`
        }
      </div>
      <div class="panel">
        <div class="panel-header"><h2 class="panel-title">Lore Cache</h2></div>
        <div>${state.discoveredLore.length > 0 ? state.discoveredLore[state.discoveredLore.length - 1] : "Campus myths, access failures, and archived fragments will appear here."}</div>
      </div>
      <div class="panel">
        <div class="panel-header"><h2 class="panel-title">Controls</h2></div>
        <div>Move with WASD or arrows. Press E to interact. Press F for search pulse in archive spaces. Press Q to toggle the board and F1 for debug.</div>
        <div class="button-row" style="margin-top:10px;">
          <button data-action="save">Save</button>
          <button class="button-danger" data-action="reset">Reset</button>
          <button data-action="toggle-debug">${state.ui.debugPanelOpen ? "Hide Debug" : "Show Debug"}</button>
        </div>
      </div>
      ${state.ui.debugPanelOpen ? renderDebugPanel(state) : ""}
    </section>
    ${state.ui.challenge ? renderChallenge(state.ui.challenge) : ""}
  `;

  attachHudEvents(root, store);
}

function renderRewardSummary(selectedQuest: QuestDefinition): string {
  const repRewards = Object.entries(selectedQuest.rewards.reputation ?? {})
    .map(([factionId, amount]) => `${labelize(factionId)} +${amount}`)
    .join(", ");
  const itemRewards = [...(selectedQuest.rewards.tools ?? []), ...(selectedQuest.rewards.keys ?? [])]
    .map(labelize)
    .join(", ");

  const segments = [repRewards, itemRewards].filter(Boolean);
  return segments.length > 0 ? `, ${segments.join(" | ")}` : "";
}

function renderChallenge(challenge: NonNullable<GameState["ui"]["challenge"]>): string {
  return `
    <div class="challenge-backdrop">
      <div class="panel challenge-panel">
        <div class="panel-header">
          <h2 class="panel-title">${challenge.title}</h2>
          <button data-action="close-challenge">Close</button>
        </div>
        <p>${challenge.description}</p>
        ${challenge.factionFlavor ? `<p class="label">${challenge.factionFlavor}</p>` : ""}
        <div class="challenge-options">
          ${challenge.options
            .map((option) => `<button class="challenge-option" data-action="challenge-answer" data-answer="${option}">${option}</button>`)
            .join("")}
        </div>
      </div>
    </div>
  `;
}

function renderDebugPanel(state: GameState): string {
  return `
    <div class="panel">
      <div class="panel-header"><h2 class="panel-title">Debug Travel</h2></div>
      <div class="debug-grid">
        ${(["library", "north-hall", "south-hall", "main-hall", "campus"] as const)
          .map(
            (building) => `
              <div class="debug-card">
                <div class="panel-header">
                  <strong>${labelize(building)}</strong>
                  <button data-action="warp" data-building="${building}">Warp</button>
                </div>
                <div class="label">${state.world.unlockedBuildings.includes(building) ? "Unlocked" : "Locked"}</div>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function attachHudEvents(root: HTMLDivElement, store: GameStore): void {
  root.querySelectorAll<HTMLButtonElement>("[data-action='select-quest']").forEach((button) => {
    button.onclick = () => {
      store.selectQuest(button.dataset.quest!);
    };
  });

  root.querySelectorAll<HTMLButtonElement>("[data-action='set-faction']").forEach((button) => {
    button.onclick = () => {
      store.setSelectedFaction(button.dataset.faction as FactionId);
    };
  });

  root.querySelectorAll<HTMLButtonElement>("[data-action='warp']").forEach((button) => {
    button.onclick = () => {
      const building = button.dataset.building as BuildingId;
      store.unlockBuilding(building);
      store.setPlayerLocation(building, { x: 580, y: 360 });
    };
  });

  root.querySelector<HTMLButtonElement>("[data-action='accept-selected']")?.addEventListener("click", () => {
    const selected = store.getState().ui.selectedQuestId;
    if (!selected) return;
    const progress = store.getState().questProgress[selected];
    if (progress?.status === "available") {
      store.acceptQuest(selected);
      return;
    }
    store.setMessage("That quest is already in progress or complete.");
  });

  root.querySelector<HTMLButtonElement>("[data-action='toggle-board']")?.addEventListener("click", () => {
    store.toggleQuestBoard();
  });

  root.querySelector<HTMLButtonElement>("[data-action='toggle-debug']")?.addEventListener("click", () => {
    store.toggleDebugPanel();
  });

  root.querySelector<HTMLButtonElement>("[data-action='save']")?.addEventListener("click", () => {
    store.save();
  });

  root.querySelector<HTMLButtonElement>("[data-action='reset']")?.addEventListener("click", () => {
    store.reset();
  });

  root.querySelector<HTMLButtonElement>("[data-action='close-challenge']")?.addEventListener("click", () => {
    store.closeChallenge();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-action='challenge-answer']").forEach((button) => {
    button.onclick = () => {
      store.submitChallengeAnswer(button.dataset.answer ?? "");
    };
  });

  root.querySelectorAll<HTMLSelectElement>("[data-filter='building']").forEach((select) => {
    select.onchange = () => {
      store.updateQuestFilters({ building: select.value as BuildingId | "all" });
    };
  });

  root.querySelectorAll<HTMLSelectElement>("[data-filter='urgency']").forEach((select) => {
    select.onchange = () => {
      store.setUrgencyFilter(select.value as QuestUrgency | "all");
    };
  });

  root.querySelectorAll<HTMLSelectElement>("[data-filter='tier']").forEach((select) => {
    select.onchange = () => {
      store.updateQuestFilters({ tier: select.value as QuestTier | "all" });
    };
  });
}
