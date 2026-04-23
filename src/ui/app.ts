import Phaser from "phaser";
import type { BuildingId, FactionId, QuestDefinition, QuestTier, QuestUrgency } from "../game/content/types";
import { GameStore } from "../game/simulation/systems/gameStore";
import { colorLabelForUrgency } from "../game/simulation/state";
import type { GameState } from "../game/simulation/types";
import { BootScene } from "../phaser/scenes/BootScene";
import { GameplayScene } from "../phaser/scenes/GameplayScene";

type HudWindowId = "character" | "quest" | "inventory" | "mission" | "lore" | "controls" | "editor";
type EditorTool = "room" | "shelf" | "table" | "route" | "label" | "plant" | "erase";
type FloorplanItem = {
  id: string;
  type: Exclude<EditorTool, "erase">;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  color: string;
};

const EDITOR_STORAGE_KEY = "weird-antioch-floorplan-editor";

let activeHudWindow: HudWindowId | null = null;
let commandLineVisible = false;
let editorTool: EditorTool = "room";
let editorItems: FloorplanItem[] = loadEditorItems();
let editorExport = "";

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
    width: 960,
    height: 540,
    roundPixels: true,
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

  window.addEventListener("keydown", (event) => {
    if (event.key === "/" && !isTextField(event.target)) {
      event.preventDefault();
      commandLineVisible = !commandLineVisible;
      renderHud(hudRoot, store.getState(), store);
      if (commandLineVisible) {
        focusCommandLine(hudRoot);
      }
      return;
    }

    if (event.key === "Escape" && commandLineVisible) {
      commandLineVisible = false;
      renderHud(hudRoot, store.getState(), store);
    }
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
  const isWindowOpen = (windowId: HudWindowId) => activeHudWindow === windowId;

  root.innerHTML = `
    <section class="mini-status" aria-label="Current status">
      <strong>${labelize(state.player.location)}</strong>
      <span>HP ${state.player.health}/5</span>
      <span>EN ${state.player.energy}/5</span>
      <span>XP ${state.player.xp}</span>
      <span>${state.player.currentObjective}</span>
    </section>

    <nav class="eq-menu" aria-label="Game windows">
      ${renderHudButton("character", "Character")}
      ${renderHudButton("quest", "Quests")}
      ${renderHudButton("inventory", "Inventory")}
      ${renderHudButton("mission", "Mission")}
      ${renderHudButton("lore", "Lore")}
      ${renderHudButton("controls", "Controls")}
      ${renderHudButton("editor", "Map Edit")}
    </nav>

    <form class="command-line ${commandLineVisible ? "" : "is-hidden"}" aria-label="Command line">
      <span class="command-prompt">&gt;</span>
      <input
        class="command-input"
        name="command"
        type="text"
        autocomplete="off"
        spellcheck="false"
        placeholder="help, stats, quests, inventory, mission, lore, controls, save, reset, board"
      />
      <button class="command-submit" type="submit">Enter</button>
    </form>

    <section id="character-stats" class="panel window-panel top-left ${isWindowOpen("character") ? "" : "is-hidden"}">
      <div class="panel-header">
        <h2 class="panel-title">Operator Status</h2>
        <button class="window-close" data-action="close-window">Close</button>
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
        <div class="overlay-block faction-standing">
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
      <div class="overlay-block faction-lens">
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

    <section id="quest-info" class="panel window-panel top-right ${isWindowOpen("quest") ? "" : "is-hidden"}">
      <div class="panel-header">
        <h2 class="panel-title">Quest Board</h2>
        <button class="window-close" data-action="close-window">Close</button>
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

    <section class="bottom-bar ${isWindowOpen("editor") ? "editor-host" : ""}">
      <div id="inventory-info" class="panel window-panel ${isWindowOpen("inventory") ? "" : "is-hidden"}">
        <div class="panel-header"><h2 class="panel-title">Tools & Keys</h2><button class="window-close" data-action="close-window">Close</button></div>
        <div class="quick-grid">
          ${state.player.tools.map((tool) => `<span class="chip">${labelize(tool)}</span>`).join("")}
          ${state.player.keys.map((key) => `<span class="chip">${labelize(key)}</span>`).join("")}
        </div>
      </div>
      <div id="mission-info" class="panel window-panel ${isWindowOpen("mission") ? "" : "is-hidden"}">
        <div class="panel-header"><h2 class="panel-title">Mission Complete</h2><button class="window-close" data-action="close-window">Close</button></div>
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
      <div id="lore-info" class="panel window-panel ${isWindowOpen("lore") ? "" : "is-hidden"}">
        <div class="panel-header"><h2 class="panel-title">Lore Cache</h2><button class="window-close" data-action="close-window">Close</button></div>
        <div>${state.discoveredLore.length > 0 ? state.discoveredLore[state.discoveredLore.length - 1] : "Campus myths, access failures, and archived fragments will appear here."}</div>
      </div>
      <div id="controls-info" class="panel window-panel ${isWindowOpen("controls") ? "" : "is-hidden"}">
        <div class="panel-header"><h2 class="panel-title">Controls</h2><button class="window-close" data-action="close-window">Close</button></div>
        <div>Move with WASD or arrows. Press E to interact. Press F for search pulse in archive spaces. Press Q to toggle the board and F1 for debug.</div>
        <div class="button-row" style="margin-top:10px;">
          <button data-action="save">Save</button>
          <button class="button-danger" data-action="reset">Reset</button>
          <button data-action="toggle-debug">${state.ui.debugPanelOpen ? "Hide Debug" : "Show Debug"}</button>
        </div>
      </div>
      <div id="editor-info" class="panel window-panel floorplan-editor ${isWindowOpen("editor") ? "" : "is-hidden"}">
        <div class="panel-header"><h2 class="panel-title">Floorplan Editor</h2><button class="window-close" data-action="close-window">Close</button></div>
        <div class="editor-layout">
          <div class="editor-toolbar" aria-label="Floorplan tools">
            ${renderEditorToolButton("room", "Room")}
            ${renderEditorToolButton("shelf", "Shelf")}
            ${renderEditorToolButton("table", "Table")}
            ${renderEditorToolButton("route", "Route")}
            ${renderEditorToolButton("label", "Label")}
            ${renderEditorToolButton("plant", "Plant")}
            ${renderEditorToolButton("erase", "Erase")}
          </div>
          <canvas class="editor-canvas" width="1320" height="760" aria-label="Editable floorplan canvas"></canvas>
          <div class="editor-fields">
            <label>
              Label
              <input class="editor-label-input" value="New ${labelize(editorTool)}" />
            </label>
            <label>
              Width
              <input class="editor-width-input" type="number" min="12" max="260" value="${defaultEditorSize(editorTool).width}" />
            </label>
            <label>
              Height
              <input class="editor-height-input" type="number" min="12" max="180" value="${defaultEditorSize(editorTool).height}" />
            </label>
            <div class="button-row">
              <button data-action="editor-save" type="button">Save Draft</button>
              <button data-action="editor-load" type="button">Load Draft</button>
              <button data-action="editor-current" type="button">Load Current Map</button>
              <button data-action="editor-export" type="button">Export JSON</button>
              <button class="button-danger" data-action="editor-clear" type="button">Clear</button>
            </div>
            <textarea class="editor-export" readonly>${editorExport}</textarea>
          </div>
        </div>
      </div>
      ${state.ui.debugPanelOpen ? renderDebugPanel(state) : ""}
    </section>
    ${state.ui.challenge ? renderChallenge(state.ui.challenge) : ""}
  `;

  attachHudEvents(root, store);
}

function renderHudButton(windowId: HudWindowId, label: string): string {
  const active = activeHudWindow === windowId ? "is-active" : "";
  return `<button class="eq-button ${active}" data-action="open-window" data-window="${windowId}" type="button">${label}</button>`;
}

function renderEditorToolButton(tool: EditorTool, label: string): string {
  const active = editorTool === tool ? "is-active" : "";
  return `<button class="editor-tool ${active}" data-action="editor-tool" data-tool="${tool}" type="button">${label}</button>`;
}

function defaultEditorSize(tool: EditorTool): { width: number; height: number; color: string } {
  switch (tool) {
    case "room":
      return { width: 120, height: 76, color: "#6d5238" };
    case "shelf":
      return { width: 112, height: 30, color: "#7a5838" };
    case "table":
      return { width: 72, height: 44, color: "#8a633c" };
    case "route":
      return { width: 140, height: 14, color: "#4aa56f" };
    case "label":
      return { width: 112, height: 28, color: "#f3e6b7" };
    case "plant":
      return { width: 28, height: 28, color: "#4f8751" };
    case "erase":
      return { width: 48, height: 48, color: "#d86d61" };
  }
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
  root.querySelectorAll<HTMLButtonElement>("[data-action='open-window']").forEach((button) => {
    button.onclick = () => {
      activeHudWindow = button.dataset.window as HudWindowId;
      renderHud(root, store.getState(), store);
    };
  });

  root.querySelectorAll<HTMLButtonElement>("[data-action='close-window']").forEach((button) => {
    button.onclick = () => {
      activeHudWindow = null;
      renderHud(root, store.getState(), store);
    };
  });

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

  root.querySelector<HTMLFormElement>(".command-line")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const input = form.elements.namedItem("command") as HTMLInputElement | null;
    const command = input?.value.trim().toLowerCase() ?? "";
    if (input) {
      input.value = "";
    }
    runCommand(command, store);
    commandLineVisible = false;
    renderHud(root, store.getState(), store);
  });

  const commandInput = root.querySelector<HTMLInputElement>(".command-input");
  for (const eventName of ["keydown", "keyup", "keypress"]) {
    commandInput?.addEventListener(eventName, (event) => {
      event.stopPropagation();
    });
  }

  attachEditorEvents(root, store);
}

function attachEditorEvents(root: HTMLDivElement, store: GameStore): void {
  root.querySelectorAll<HTMLButtonElement>("[data-action='editor-tool']").forEach((button) => {
    button.onclick = () => {
      editorTool = button.dataset.tool as EditorTool;
      renderHud(root, store.getState(), store);
    };
  });

  root.querySelector<HTMLButtonElement>("[data-action='editor-save']")?.addEventListener("click", () => {
    window.localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(editorItems));
    store.setMessage("Floorplan draft saved locally.");
  });

  root.querySelector<HTMLButtonElement>("[data-action='editor-load']")?.addEventListener("click", () => {
    editorItems = loadEditorItems();
    renderHud(root, store.getState(), store);
    store.setMessage("Floorplan draft loaded.");
  });

  root.querySelector<HTMLButtonElement>("[data-action='editor-current']")?.addEventListener("click", () => {
    editorItems = createCurrentLibraryFloorplanItems();
    editorExport = "";
    renderHud(root, store.getState(), store);
    store.setMessage("Loaded the current library map into the floorplan editor.");
  });

  root.querySelector<HTMLButtonElement>("[data-action='editor-export']")?.addEventListener("click", () => {
    editorExport = JSON.stringify(editorItems, null, 2);
    renderHud(root, store.getState(), store);
    store.setMessage("Floorplan JSON exported in the editor window.");
  });

  root.querySelector<HTMLButtonElement>("[data-action='editor-clear']")?.addEventListener("click", () => {
    editorItems = [];
    editorExport = "";
    renderHud(root, store.getState(), store);
    store.setMessage("Floorplan editor cleared.");
  });

  const canvas = root.querySelector<HTMLCanvasElement>(".editor-canvas");
  if (!canvas) {
    return;
  }

  drawEditorCanvas(canvas);
  canvas.onclick = (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

    if (editorTool === "erase") {
      editorItems = editorItems.filter((item) => !pointInEditorItem(x, y, item));
      drawEditorCanvas(canvas);
      return;
    }

    const size = defaultEditorSize(editorTool);
    const label = root.querySelector<HTMLInputElement>(".editor-label-input")?.value.trim() || labelize(editorTool);
    const width = Number(root.querySelector<HTMLInputElement>(".editor-width-input")?.value) || size.width;
    const height = Number(root.querySelector<HTMLInputElement>(".editor-height-input")?.value) || size.height;
    editorItems.push({
      id: `${editorTool}-${Date.now()}`,
      type: editorTool,
      x: Math.round(x),
      y: Math.round(y),
      width,
      height,
      label,
      color: size.color,
    });
    drawEditorCanvas(canvas);
  };
}

function drawEditorCanvas(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#1c2a35";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = "rgba(230, 215, 170, 0.12)";
  context.lineWidth = 1;
  for (let x = 20; x < canvas.width; x += 20) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 20; y < canvas.height; y += 20) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }

  drawEditorShell(context);
  for (const item of editorItems) {
    drawEditorItem(context, item);
  }
}

function drawEditorShell(context: CanvasRenderingContext2D): void {
  context.lineWidth = 4;
  context.strokeStyle = "#15120f";
  context.fillStyle = "rgba(93, 92, 79, 0.38)";
  context.fillRect(100, 240, 500, 360);
  context.strokeRect(100, 240, 500, 360);
  context.fillStyle = "rgba(123, 84, 51, 0.38)";
  context.fillRect(600, 240, 560, 360);
  context.strokeRect(600, 240, 560, 360);
  context.fillStyle = "rgba(111, 135, 147, 0.38)";
  context.fillRect(620, 48, 290, 194);
  context.strokeRect(620, 48, 290, 194);
  context.fillStyle = "rgba(138, 95, 60, 0.38)";
  context.fillRect(910, 48, 160, 194);
  context.strokeRect(910, 48, 160, 194);
  context.fillStyle = "rgba(111, 119, 110, 0.48)";
  context.beginPath();
  context.moveTo(680, 600);
  context.lineTo(800, 600);
  context.lineTo(840, 730);
  context.lineTo(700, 750);
  context.lineTo(610, 720);
  context.closePath();
  context.fill();
  context.stroke();
  context.fillStyle = "#f3e6b7";
  context.font = "20px Georgia";
  context.fillText("Library First Floor Draft", 28, 32);
}

function drawEditorItem(context: CanvasRenderingContext2D, item: FloorplanItem): void {
  context.save();
  context.fillStyle = item.color;
  context.strokeStyle = "#15120f";
  context.lineWidth = 2;

  if (item.type === "label") {
    context.fillStyle = "#f3e6b7";
    context.font = "14px Georgia";
    context.fillText(item.label, item.x, item.y);
    context.restore();
    return;
  }

  if (item.type === "plant") {
    context.beginPath();
    context.arc(item.x, item.y, Math.max(item.width, item.height) / 2, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.restore();
    return;
  }

  context.fillRect(item.x - item.width / 2, item.y - item.height / 2, item.width, item.height);
  context.strokeRect(item.x - item.width / 2, item.y - item.height / 2, item.width, item.height);
  if (item.label) {
    context.fillStyle = "#f1ead0";
    context.font = "12px Georgia";
    context.fillText(item.label, item.x - item.width / 2 + 6, item.y + 4);
  }
  context.restore();
}

function pointInEditorItem(x: number, y: number, item: FloorplanItem): boolean {
  return (
    x >= item.x - item.width / 2 &&
    x <= item.x + item.width / 2 &&
    y >= item.y - item.height / 2 &&
    y <= item.y + item.height / 2
  );
}

function loadEditorItems(): FloorplanItem[] {
  const raw = window.localStorage.getItem(EDITOR_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as FloorplanItem[];
  } catch {
    return [];
  }
}

function createCurrentLibraryFloorplanItems(): FloorplanItem[] {
  const items: FloorplanItem[] = [
    { id: "current-left-wing", type: "room", x: 350, y: 420, width: 500, height: 360, label: "STACKS", color: "#5d5c4f" },
    { id: "current-main-wing", type: "room", x: 880, y: 420, width: 560, height: 360, label: "PUBLIC FLOOR", color: "#7b5433" },
    { id: "current-staff", type: "room", x: 765, y: 145, width: 290, height: 194, label: "STAFF ONLY", color: "#6f8793" },
    { id: "current-stairs", type: "room", x: 990, y: 145, width: 160, height: 194, label: "STAIRS", color: "#8a5f3c" },
    { id: "current-circ", type: "table", x: 760, y: 352, width: 180, height: 48, label: "CIRCULATION", color: "#8a633c" },
    { id: "current-table-a", type: "table", x: 690, y: 520, width: 92, height: 92, label: "study", color: "#8a633c" },
    { id: "current-table-b", type: "table", x: 1050, y: 392, width: 84, height: 116, label: "study", color: "#8a633c" },
    { id: "current-entry-route", type: "route", x: 650, y: 525, width: 850, height: 18, label: "evac route", color: "#4aa56f" },
    { id: "current-south-route", type: "route", x: 790, y: 645, width: 18, height: 150, label: "exit", color: "#4aa56f" },
    { id: "current-label", type: "label", x: 130, y: 690, width: 240, height: 28, label: "LIBRARY - FIRST FLOOR", color: "#f3e6b7" },
  ];

  for (let row = 0; row < 5; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      items.push({
        id: `current-shelf-${row}-${col}`,
        type: "shelf",
        x: 190 + col * 130,
        y: 320 + row * 56,
        width: 112,
        height: 30,
        label: "",
        color: "#7a5838",
      });
    }
  }

  for (const [index, point] of [
    [120, 260],
    [575, 260],
    [120, 575],
    [575, 575],
    [1140, 575],
    [1035, 98],
  ].entries()) {
    items.push({
      id: `current-plant-${index}`,
      type: "plant",
      x: point[0],
      y: point[1],
      width: 28,
      height: 28,
      label: "",
      color: "#4f8751",
    });
  }

  return items;
}

function focusCommandLine(root: HTMLDivElement): void {
  window.requestAnimationFrame(() => {
    root.querySelector<HTMLInputElement>(".command-input")?.focus();
  });
}

function isTextField(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.matches("input, textarea, select, [contenteditable='true']");
}

function runCommand(command: string, store: GameStore): void {
  if (!command) {
    store.setMessage("Command line ready. Type help for available commands.");
    return;
  }

  const [verb] = command.split(/\s+/);
  switch (verb) {
    case "help":
    case "?":
      store.setMessage("Commands: stats, quests, inventory, mission, lore, controls, editor, board, save, reset, debug.");
      return;
    case "stats":
    case "character":
    case "char":
      activeHudWindow = "character";
      navigateToPanel("character-stats");
      store.setMessage("Opened character stats.");
      return;
    case "quests":
    case "quest":
      activeHudWindow = "quest";
      store.toggleQuestBoard(true);
      navigateToPanel("quest-info");
      store.setMessage("Opened quest board.");
      return;
    case "inventory":
    case "inv":
    case "items":
      activeHudWindow = "inventory";
      navigateToPanel("inventory-info");
      store.setMessage("Opened tools and keys.");
      return;
    case "mission":
      activeHudWindow = "mission";
      navigateToPanel("mission-info");
      store.setMessage("Opened mission window.");
      return;
    case "lore":
      activeHudWindow = "lore";
      navigateToPanel("lore-info");
      store.setMessage("Opened lore cache.");
      return;
    case "controls":
    case "keys":
      activeHudWindow = "controls";
      navigateToPanel("controls-info");
      store.setMessage("Opened controls.");
      return;
    case "editor":
    case "edit":
    case "map":
      activeHudWindow = "editor";
      navigateToPanel("editor-info");
      store.setMessage("Opened floorplan editor.");
      return;
    case "board":
      activeHudWindow = "quest";
      store.toggleQuestBoard();
      navigateToPanel("quest-info");
      return;
    case "debug":
      store.toggleDebugPanel();
      return;
    case "save":
      store.save();
      return;
    case "reset":
      store.reset();
      return;
    default:
      store.setMessage(`Unknown command: ${command}. Type help for available commands.`);
  }
}

function navigateToPanel(id: string): void {
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });
  });
}
