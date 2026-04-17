export const assetManifest = {
  player: "player",
  buildingLibrary: "building-library",
  buildingNorthHall: "building-north-hall",
  buildingSouthHall: "building-south-hall",
  buildingMainHall: "building-main-hall",
  archiveRoomBackdrop: "archive-room-backdrop",
  groundCampus: "ground-campus",
  groundInterior: "ground-interior",
} as const;

export type AssetKey = (typeof assetManifest)[keyof typeof assetManifest];
