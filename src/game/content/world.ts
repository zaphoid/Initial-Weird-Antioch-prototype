import type { BuildingId } from "./types";

export interface ZoneProp {
  id: string;
  zone: BuildingId;
  kind: "tree" | "lamp" | "bench" | "crate" | "terminal" | "banner" | "statue" | "rack" | "stage" | "desk";
  x: number;
  y: number;
  label?: string;
  scale?: number;
}

export interface ZoneNpc {
  id: string;
  zone: BuildingId;
  name: string;
  role: string;
  x: number;
  y: number;
  palette: "student" | "staff" | "archivist" | "admin" | "performer";
  dialogue: string;
}

export interface ZoneLandmark {
  id: string;
  zone: BuildingId;
  title: string;
  body: string;
  x: number;
  y: number;
}

export interface ZoneHazard {
  id: string;
  zone: BuildingId;
  type: "goose" | "squirrel" | "faculty" | "staff";
  x: number;
  y: number;
  speed: number;
  detectionRadius: number;
  patrolPoints: Array<{ x: number; y: number }>;
  hint: string;
}

export const zoneProps: ZoneProp[] = [
  { id: "quad-tree-1", zone: "campus", kind: "tree", x: 120, y: 100, scale: 1.05 },
  { id: "quad-tree-2", zone: "campus", kind: "tree", x: 390, y: 95, scale: 1.1 },
  { id: "quad-tree-3", zone: "campus", kind: "tree", x: 980, y: 95, scale: 1.1 },
  { id: "quad-tree-4", zone: "campus", kind: "tree", x: 1080, y: 520, scale: 1.05 },
  { id: "quad-bench-1", zone: "campus", kind: "bench", x: 360, y: 560, label: "Oval Bench" },
  { id: "quad-bench-2", zone: "campus", kind: "bench", x: 785, y: 560, label: "Rod Serling Marker" },
  { id: "quad-statue", zone: "campus", kind: "statue", x: 605, y: 510, label: "Horace Mann Statue" },
  { id: "quad-lamp-1", zone: "campus", kind: "lamp", x: 430, y: 325 },
  { id: "quad-lamp-2", zone: "campus", kind: "lamp", x: 780, y: 325 },
  { id: "quad-banner-main", zone: "campus", kind: "banner", x: 600, y: 165, label: "Main Hall" },
  { id: "campus-library-banner", zone: "campus", kind: "banner", x: 275, y: 230, label: "Library / IT" },
  { id: "campus-north-banner", zone: "campus", kind: "banner", x: 275, y: 80, label: "North Hall" },
  { id: "campus-south-banner", zone: "campus", kind: "banner", x: 915, y: 230, label: "South Hall" },
  { id: "lib-terminal", zone: "library", kind: "terminal", x: 262, y: 258, label: "Public Catalog" },
  { id: "lib-terminal-2", zone: "library", kind: "terminal", x: 270, y: 356, label: "Quest Board Kiosk" },
  { id: "lib-rack-1", zone: "library", kind: "rack", x: 920, y: 438, label: "Circulation Returns" },
  { id: "lib-rack-2", zone: "library", kind: "rack", x: 972, y: 438, label: "Media Storage" },
  { id: "lib-desk", zone: "library", kind: "desk", x: 616, y: 268 },
  { id: "lib-desk-2", zone: "library", kind: "desk", x: 715, y: 265 },
  { id: "north-bench", zone: "north-hall", kind: "bench", x: 500, y: 520, label: "Dorm Lounge" },
  { id: "north-crate", zone: "north-hall", kind: "crate", x: 760, y: 275, label: "Warm Radiator Cache" },
  { id: "north-banner", zone: "north-hall", kind: "banner", x: 320, y: 170, label: "Rumor Board" },
  { id: "north-bench-2", zone: "north-hall", kind: "bench", x: 690, y: 500, label: "After-Hours Bench" },
  { id: "archive-room-shelf-1", zone: "north-hall-archive-room", kind: "crate", x: 405, y: 250, label: "Shelf A" },
  { id: "archive-room-shelf-2", zone: "north-hall-archive-room", kind: "crate", x: 565, y: 220, label: "Shelf B" },
  { id: "archive-room-shelf-3", zone: "north-hall-archive-room", kind: "crate", x: 730, y: 265, label: "Shelf C" },
  { id: "archive-room-terminal", zone: "north-hall-archive-room", kind: "terminal", x: 260, y: 445, label: "Pulse Reader" },
  { id: "south-desk-1", zone: "south-hall", kind: "desk", x: 530, y: 220, label: "Admissions Desk" },
  { id: "south-desk-2", zone: "south-hall", kind: "desk", x: 660, y: 220, label: "Financial Aid" },
  { id: "south-rack", zone: "south-hall", kind: "rack", x: 760, y: 360, label: "Access Control Rack" },
  { id: "south-terminal", zone: "south-hall", kind: "terminal", x: 615, y: 380, label: "Audit Console" },
  { id: "south-banner", zone: "south-hall", kind: "banner", x: 235, y: 160, label: "Badge Access" },
  { id: "south-desk-3", zone: "south-hall", kind: "desk", x: 565, y: 430, label: "HR Forms" },
  { id: "main-stage", zone: "main-hall", kind: "stage", x: 620, y: 340, label: "Grand Stage" },
  { id: "main-banner", zone: "main-hall", kind: "banner", x: 620, y: 150, label: "Revive the Festival" },
  { id: "main-crate", zone: "main-hall", kind: "crate", x: 455, y: 430, label: "Backstage Storage" }
];

export const zoneNpcs: ZoneNpc[] = [
  {
    id: "campus-student-1",
    zone: "campus",
    name: "Jules",
    role: "Student Explorer",
    x: 720,
    y: 465,
    palette: "student",
    dialogue: "The Oval feels normal until someone mentions the meteor hoax, then the air starts acting guilty.",
  },
  {
    id: "campus-staff-1",
    zone: "campus",
    name: "Marta",
    role: "Facilities Runner",
    x: 365,
    y: 330,
    palette: "staff",
    dialogue: "If the geothermal tunnels start singing again, call Facilities before the poets hear about it.",
  },
  {
    id: "library-npc-1",
    zone: "library",
    name: "Mina",
    role: "Night Archivist",
    x: 675,
    y: 318,
    palette: "archivist",
    dialogue: "Every archive box is labeled correctly until campus memory decides it deserves a side quest.",
  },
  {
    id: "library-npc-2",
    zone: "library",
    name: "Terry",
    role: "Operations Lead",
    x: 930,
    y: 484,
    palette: "staff",
    dialogue: "If a badge reader gets philosophical, unplug it before it starts writing policy.",
  },
  {
    id: "north-npc-1",
    zone: "north-hall",
    name: "Rae",
    role: "Resident Assistant",
    x: 420,
    y: 445,
    palette: "student",
    dialogue: "Dorm drama scales linearly until after midnight, then it becomes folklore.",
  },
  {
    id: "north-npc-2",
    zone: "north-hall",
    name: "Owen",
    role: "Rumor Cartographer",
    x: 310,
    y: 245,
    palette: "student",
    dialogue: "I map whispers by floor and intensity. The third-floor corridor has gone bright violet.",
  },
  {
    id: "south-npc-1",
    zone: "south-hall",
    name: "Dean Vale",
    role: "Administrative Presence",
    x: 630,
    y: 285,
    palette: "admin",
    dialogue: "No one likes the badge system. The badge system likes that.",
  },
  {
    id: "main-npc-1",
    zone: "main-hall",
    name: "Iris",
    role: "Ghostlight Keeper",
    x: 560,
    y: 270,
    palette: "performer",
    dialogue: "Every campus mystery eventually wants a stage cue.",
  }
];

export const zoneLandmarks: ZoneLandmark[] = [
  {
    id: "campus-landmark-1",
    zone: "campus",
    title: "The Oval",
    body: "The social heart of campus. Satire, gossip, and side quests circulate here faster than official announcements.",
    x: 610,
    y: 625,
  },
  {
    id: "campus-landmark-2",
    zone: "campus",
    title: "Main Hall Facade",
    body: "The mythic anchor of the map, looming over the quad like a theatrical promise.",
    x: 540,
    y: 18,
  },
  {
    id: "campus-landmark-3",
    zone: "campus",
    title: "Library / IT West Walk",
    body: "The practical side of the campus loop. Most early quest flow starts and resolves here.",
    x: 180,
    y: 205,
  },
  {
    id: "campus-landmark-4",
    zone: "campus",
    title: "South Hall East Approach",
    body: "Administrative access, paperwork trouble, and keycard friction live beyond this route.",
    x: 860,
    y: 205,
  },
  {
    id: "library-landmark",
    zone: "library",
    title: "Olive Kettering Library",
    body: "A mid-century research hub with a circulation core, student commons energy, and Antiochiana upstairs.",
    x: 178,
    y: 112,
  },
  {
    id: "archive-room-landmark",
    zone: "north-hall-archive-room",
    title: "Archive Side Room",
    body: "A compact VRML-inspired side space. Use the search pulse to sweep shelf depth until Box 17 reveals itself.",
    x: 250,
    y: 120,
  }
];

export const zoneHazards: ZoneHazard[] = [
  {
    id: "campus-goose-1",
    zone: "campus",
    type: "goose",
    x: 520,
    y: 470,
    speed: 54,
    detectionRadius: 120,
    patrolPoints: [{ x: 520, y: 470 }, { x: 660, y: 470 }, { x: 620, y: 560 }],
    hint: "A goose lowers its head and starts charging if you cut across the Oval too directly.",
  },
  {
    id: "campus-squirrel-1",
    zone: "campus",
    type: "squirrel",
    x: 390,
    y: 360,
    speed: 72,
    detectionRadius: 90,
    patrolPoints: [{ x: 390, y: 360 }, { x: 470, y: 320 }, { x: 420, y: 250 }],
    hint: "This squirrel steals your route timing more than your items.",
  },
  {
    id: "campus-goose-2",
    zone: "campus",
    type: "goose",
    x: 770,
    y: 340,
    speed: 50,
    detectionRadius: 110,
    patrolPoints: [{ x: 770, y: 340 }, { x: 900, y: 320 }, { x: 860, y: 420 }],
    hint: "The geese treat cross-campus travel like a territorial negotiation.",
  },
  {
    id: "north-faculty-1",
    zone: "north-hall",
    type: "faculty",
    x: 560,
    y: 230,
    speed: 64,
    detectionRadius: 145,
    patrolPoints: [{ x: 560, y: 230 }, { x: 720, y: 230 }, { x: 700, y: 330 }],
    hint: "A faculty member on a mission will absolutely body-check your side quest if you drift into their line.",
  },
  {
    id: "north-staff-1",
    zone: "north-hall",
    type: "staff",
    x: 500,
    y: 410,
    speed: 60,
    detectionRadius: 130,
    patrolPoints: [{ x: 500, y: 410 }, { x: 620, y: 470 }, { x: 360, y: 500 }],
    hint: "Staff traffic is unpredictable when the building starts humming with rumor energy.",
  },
];
