import type { InteractableDefinition } from "./types";

export const interactables: InteractableDefinition[] = [
  {
    id: "quest-board-terminal",
    label: "Quest Board Terminal",
    zone: "library",
    type: "terminal",
    onInteractText: "The library wall display flickers awake. New incidents pulse in green, yellow, red, and violet.",
  },
  {
    id: "archive-box-17",
    label: "Archive Box 17",
    zone: "north-hall",
    type: "archive-box",
    requiredFlags: ["quest:archive-box-17:accepted"],
    onInteractText: "Someone hid the missing archive box behind a radiator. The label is warm to the touch for no good reason.",
  },
  {
    id: "south-hall-badge-reader",
    label: "South Hall Badge Reader",
    zone: "south-hall",
    type: "door",
    requiredTools: ["visitor-badge"],
    onInteractText: "The reader chirps once, then reluctantly approves your presence in the administrative tower.",
  },
  {
    id: "server-rack-alpha",
    label: "Server Rack Alpha",
    zone: "library",
    type: "server-rack",
    requiredFlags: ["quest:badge-failure:accepted"],
    onInteractText: "A UPS warning loops in six different tones. One breaker reset should stop the campus-wide panic.",
  },
];
