import type { FactionDefinition } from "./types";

export const factions: FactionDefinition[] = [
  {
    id: "it-operations",
    name: "IT Operations",
    startingFlavor: "You know where the dead terminals are buried, and which cables should not hum that way.",
    perks: ["Starts with Network Toolkit", "Extra dialogue options with tech staff"],
    questAffinity: ["network", "archives", "systems"],
  },
  {
    id: "facilities",
    name: "Facilities",
    startingFlavor: "You understand how hidden service routes keep the campus alive after dark.",
    perks: ["Maintenance shortcuts", "Access to pressure and utility hints"],
    questAffinity: ["repairs", "utilities", "underground"],
  },
  {
    id: "student-residents",
    name: "Student Residents",
    startingFlavor: "You know the rumor economy, the dorm politics, and which stairwells are actually portals to side quests.",
    perks: ["More social quest options", "Resident trust bonuses"],
    questAffinity: ["social", "dorm", "satire"],
  },
  {
    id: "administrators",
    name: "Administrators",
    startingFlavor: "You speak fluent badge access, paperwork ritual, and hallway diplomacy.",
    perks: ["Starts with temporary visitor badge", "Better outcomes in South Hall"],
    questAffinity: ["paperwork", "access", "bureaucracy"],
  },
  {
    id: "archivists",
    name: "Archivists",
    startingFlavor: "You hear campus memory in every mislabeled file box and every story that refuses to stay filed.",
    perks: ["Extra lore notes", "Faster archive recoveries"],
    questAffinity: ["lore", "recovery", "mystery"],
  },
];
