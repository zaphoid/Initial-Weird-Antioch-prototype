import type { BuildingId } from "../../game/content/types";
import { questDefinitions } from "../../game/content/quests";
import { GameStore } from "../../game/simulation/systems/gameStore";

export interface PortalDefinition {
  id: string;
  label: string;
  x: number;
  y: number;
  target: BuildingId;
}

export interface InteractableInstance {
  id: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  onInteract: () => void;
}

export function createPortals(_store: GameStore, location: BuildingId): PortalDefinition[] {
  switch (location) {
    case "campus":
      return [
        { id: "to-library", label: "Library", x: 280, y: 220, target: "library" },
        { id: "to-north-hall", label: "North Hall", x: 870, y: 180, target: "north-hall" },
        { id: "to-south-hall", label: "South Hall", x: 900, y: 470, target: "south-hall" },
        { id: "to-main-hall", label: "Main Hall", x: 500, y: 120, target: "main-hall" },
      ];
    case "library":
      return [{ id: "to-campus", label: "Back to Campus", x: 1000, y: 620, target: "campus" }];
    case "north-hall":
      return [
        { id: "to-campus", label: "Back to Campus", x: 1020, y: 620, target: "campus" },
        { id: "to-archive-room", label: "Archive Room", x: 820, y: 170, target: "north-hall-archive-room" },
      ];
    case "north-hall-archive-room":
      return [{ id: "to-north-hall", label: "Back to North Hall", x: 1040, y: 620, target: "north-hall" }];
    case "south-hall":
      return [{ id: "to-campus", label: "Back to Campus", x: 1020, y: 620, target: "campus" }];
    case "main-hall":
      return [{ id: "to-campus", label: "Back to Campus", x: 1020, y: 620, target: "campus" }];
  }
}

export function createInteractables(
  store: GameStore,
  location: BuildingId,
): InteractableInstance[] {
  const state = store.getState();
  const faction = state.player.faction;

  const base = {
    library: [
      {
        id: "quest-board",
        x: 300,
        y: 355,
        radius: 44,
        label: "Quest Board",
        onInteract: () => {
          store.toggleQuestBoard(true);
          store.setMessage("The board updates with campus incidents and suspiciously elegant color coding.");
        },
      },
      {
        id: "mina-turn-in",
        x: 674,
        y: 316,
        radius: 42,
        label: "Mina, Night Archivist",
        onInteract: () => {
          if (state.flags.includes("quest:archive-box-17:box-recovered")) {
            store.completeQuest(
              "archive-box-17",
              faction === "archivists"
                ? "Mina clocks your archival method immediately and treats you like a colleague instead of a courier. Together you unpack tunnel references, South Hall outages, and the first hint that Main Hall is part machine and part memory."
                : faction === "it-operations"
                  ? "Mina is amused that you solved an archive lock like a debugging problem, but she cannot argue with the result. Inside: tunnel references, South Hall outages, and the first hint that Main Hall is part machine and part memory."
                  : "Mina slides the box into the archive cart and whispers that Ada would have approved. Inside: tunnel references, South Hall outages, and the first hint that Main Hall is part machine and part memory.",
            );
          } else if (!state.flags.includes("quest:archive-box-17:accepted") && !state.flags.includes("quest:archive-box-17:completed")) {
            store.acceptQuest("archive-box-17");
            store.setMessage(
              faction === "archivists"
                ? "Mina trusts your archival instincts enough to hand this off directly. She points you toward a hidden North Hall side room and warns you the route is less scholarly than it sounds."
                : "Mina gives you the assignment directly instead of posting it publicly. She says the board is for routine work, but this one needs discretion and a fast trip to North Hall.",
            );
          } else if (state.flags.includes("quest:archive-box-17:accepted")) {
            store.setMessage(
              faction === "archivists"
                ? "Mina lowers her voice: 'Read it like an accession trail, not a puzzle prop. Ada left a breadcrumb in the metadata.'"
                : faction === "it-operations"
                  ? "Mina lowers her voice: 'Treat it like a trace log. Ada left the target in the note if you read it as a system.'"
                  : "Mina reminds you that the box is protected by a lock note citing Ada Lovelace. Check the radiator cache in North Hall.",
            );
          } else {
            store.setMessage("Mina asks whether Box 17 has turned up in the dorm rumor ecosystem yet.");
          }
        },
      },
      {
        id: "terry-turn-in",
        x: 930,
        y: 485,
        radius: 42,
        label: "Terry, Operations Lead",
        onInteract: () => {
          if (state.flags.includes("quest:badge-failure:logs-audited")) {
            store.completeQuest(
              "badge-failure",
              faction === "it-operations"
                ? "Terry reads the log bundle like a field report and finally starts speaking to you as another operator. NERO touched the badge system, the Oval marker, and an old South Hall record tied to Rod Serling. He hands you the Main Hall stage key."
                : faction === "administrators"
                  ? "Terry is visibly unsettled that your reading of authority chains matches the logs exactly. NERO touched the badge system, the Oval marker, and an old South Hall record tied to Rod Serling. He hands you the Main Hall stage key."
                  : "Terry scans the recovered logs and goes quiet. NERO touched the badge system, the Oval marker, and an old South Hall record tied to Rod Serling. He hands you the Main Hall stage key and tells you Antioch only gets stranger from here.",
            );
          } else if (state.flags.includes("quest:badge-failure:rack-reset")) {
            store.setMessage("Terry wants the audit console reviewed too. A reset fixes the symptom; the logs explain the campus.");
          } else {
            store.setMessage("Terry points at South Hall and mutters something about badge systems developing personalities.");
          }
        },
      },
    ],
    "north-hall": [
      {
        id: "disturbance",
        x: 420,
        y: 400,
        radius: 42,
        label: "Dorm Disturbance",
        onInteract: () => {
          if (!state.flags.includes("quest:north-hall-disturbance:accepted")) {
            store.setMessage("The hallway argument is escalating artistically. Someone should probably accept that request.");
            return;
          }
          store.openChallenge({
            type: "disturbance-choice",
            questId: "north-hall-disturbance",
            title: "Dorm Mediation",
            description:
              faction === "student-residents"
                ? "Two residents are escalating a rumor about a haunted rehearsal tape. You know dorm politics well enough to redirect the energy instead of suppressing it."
                : faction === "archivists"
                  ? "Two residents are escalating a rumor about a haunted rehearsal tape. You can either dismiss it or preserve it as living campus folklore."
                  : "Two residents are escalating a rumor about a haunted rehearsal tape. Pick the response that turns chaos into a quest instead of a feud.",
            factionFlavor:
              faction === "student-residents"
                ? "Student-resident approach: redirect drama into shared participation."
                : faction === "archivists"
                  ? "Archivist approach: preserve the story so people stop fighting over ownership of it."
                  : undefined,
            options: [
              "Tell them both to be quiet immediately",
              "Ask them to reconstruct the rumor as a campus quest",
              "Threaten to report the whole floor",
              ...(faction === "student-residents" ? ["Offer to map the rumor chain floor by floor"] : []),
              ...(faction === "archivists" ? ["Ask them to document the tape as living campus folklore"] : []),
            ],
          });
        },
      },
      {
        id: "rae-turn-in",
        x: 420,
        y: 445,
        radius: 40,
        label: "Rae, Resident Assistant",
        onInteract: () => {
          if (state.flags.includes("quest:north-hall-disturbance:resolved")) {
            store.completeQuest(
              "north-hall-disturbance",
              "Rae logs the incident as 'resolved through collaborative storytelling,' which somehow feels both unserious and deeply Antioch. She mentions the rehearsal tape came from an old Main Hall festival archive.",
            );
          } else if (state.flags.includes("quest:north-hall-disturbance:accepted")) {
            store.setMessage("Rae asks whether the floor is calmer yet, or at least calmer enough to stop inventing ghosts per minute.");
          }
        },
      },
    ],
    "north-hall-archive-room": [
      {
        id: "pulse-reader",
        x: 1036,
        y: 382,
        radius: 40,
        label: "Pulse Reader",
        onInteract: () => {
          store.setMessage("The reader hums: 'Use F to sweep the room. Repeated pulses increase your search radius.'");
        },
      },
      {
        id: "archive-box-17-revealed",
        x: 806,
        y: 494,
        radius: 34,
        label: "Archive Box 17",
        onInteract: () => {
          if (!state.flags.includes("quest:archive-box-17:box-revealed")) {
            store.setMessage("You know the box is in here somewhere, but you need to reveal the right shelf first.");
            return;
          }
          if (state.flags.includes("quest:archive-box-17:box-recovered")) {
            store.setMessage("Archive Box 17 is already secured. Mina is waiting back in the Library.");
            return;
          }
          store.progressQuestObjective(
            "archive-box-17",
            "quest:archive-box-17:box-recovered",
            "The revealed shelf glows softly. You pull Box 17 free from the false backing and tuck it under your arm.",
          );
        },
      },
    ],
    "south-hall": [
      {
        id: "badge-reader",
        x: 320,
        y: 220,
        radius: 42,
        label: "Badge Reader",
        onInteract: () => {
          if (!store.hasTool("visitor-badge")) {
            store.setMessage("The reader rejects you with deeply administrative disappointment.");
            return;
          }

          store.progressQuestObjective(
            "badge-failure",
            "quest:badge-failure:entered-south-hall",
            "Visitor badge accepted. South Hall reluctantly allows you upstairs.",
          );
        },
      },
      {
        id: "rack-reset",
        x: 760,
        y: 360,
        radius: 42,
        label: "Control Rack",
        onInteract: () => {
          if (!state.flags.includes("quest:badge-failure:accepted")) {
            store.setMessage("The rack is whining, but your work order does not technically exist yet.");
            return;
          }
          if (!state.flags.includes("quest:badge-failure:entered-south-hall")) {
            store.setMessage("The rack wants you to authenticate at the badge reader first.");
            return;
          }
          store.openChallenge({
            type: "badge-reset",
            questId: "badge-failure",
            title: "Badge Failure Reset",
            description:
              faction === "facilities"
                ? "The rack is misbehaving like infrastructure under stress. Pick the restoration order that respects how systems come back safely."
                : faction === "administrators"
                  ? "The rack is basically paperwork with electricity. Choose the order that restores authority from the top down."
                  : "You need to restore South Hall in the right troubleshooting order. Which reset sequence makes the most sense?",
            factionFlavor:
              faction === "facilities"
                ? "Facilities approach: stabilize the utility chain first."
                : faction === "administrators"
                  ? "Administrator approach: restore authority and access in order."
                  : faction === "it-operations"
                    ? "IT approach: reset power, controller, then endpoint."
                    : undefined,
            options: [
              "Door Node -> Badge Controller -> UPS",
              "UPS -> Badge Controller -> Door Node",
              "Badge Controller -> UPS -> Door Node",
              ...(faction === "facilities" ? ["Stabilize power, then controller, then field hardware"] : []),
              ...(faction === "administrators" ? ["Validate power approval, then controller authority, then endpoint access"] : []),
            ],
          });
        },
      },
      {
        id: "audit-console",
        x: 615,
        y: 380,
        radius: 42,
        label: "Audit Console",
        onInteract: () => {
          if (!state.flags.includes("quest:badge-failure:rack-reset")) {
            store.setMessage("The audit console is useful after the rack stabilizes. Right now it is just blinking judgment.");
            return;
          }
          if (state.flags.includes("quest:badge-failure:logs-audited")) {
            store.setMessage("The logs are already captured: badge reader loops, NERO references, and one unnerving Oval marker timestamp.");
            return;
          }
          store.progressQuestObjective(
            "badge-failure",
            "quest:badge-failure:logs-audited",
            "The console shows repeated badge failures routed through a ghost process named NERO, plus an access event mapped to the Rod Serling marker outside South Hall. Terry needs to see this.",
          );
        },
      },
    ],
    "main-hall": [
      {
        id: "nero-hint",
        x: 580,
        y: 240,
        radius: 42,
        label: "NERO Trace",
        onInteract: () => {
          store.setMessage("A hidden trace points toward a future Main Hall mystery. This is the edge of the current slice.");
        },
      },
    ],
    campus: [],
  } satisfies Record<BuildingId, InteractableInstance[]>;

  return base[location];
}

export function canTraverseTo(store: GameStore, target: BuildingId): { ok: boolean; reason?: string } {
  if (target === "south-hall" && !store.hasTool("visitor-badge")) {
    return { ok: false, reason: "South Hall access requires the visitor badge earned from the archive recovery quest." };
  }

  if (target === "main-hall" && !store.hasTool("main-hall-stage-key")) {
    return { ok: false, reason: "Main Hall remains sealed until the South Hall badge failure is resolved." };
  }

  return { ok: true };
}

export function acceptSelectedQuest(store: GameStore): void {
  const selected = store.getState().ui.selectedQuestId;
  if (!selected) {
    return;
  }

  const quest = questDefinitions.find((entry) => entry.id === selected);
  const progress = store.getState().questProgress[selected];

  if (!quest) {
    return;
  }

  if (!quest.prerequisites.every((flag) => store.getState().flags.includes(flag))) {
    store.setMessage("That board item is still locked behind a stranger chain of events.");
    return;
  }

  if (progress?.status === "available") {
    store.acceptQuest(selected);
    return;
  }

  if (progress?.status === "accepted") {
    store.setMessage(`${quest.title} is already active.`);
    return;
  }

  store.setMessage(`${quest.title} is already complete.`);
}
