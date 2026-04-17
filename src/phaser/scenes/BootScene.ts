import Phaser from "phaser";
import { assetManifest } from "../../game/assets/manifest";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    this.load.image(assetManifest.archiveRoomBackdrop, "assets/rooms/north-hall-archive-backdrop.png");
  }

  create(): void {
    this.scene.start("gameplay");
  }
}
