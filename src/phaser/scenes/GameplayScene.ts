import Phaser from "phaser";
import { assetManifest } from "../../game/assets/manifest";
import type { BuildingId } from "../../game/content/types";
import { zoneHazards, zoneLandmarks, zoneNpcs, zoneProps, type ZoneHazard, type ZoneProp } from "../../game/content/world";
import { createInputBindings, isActionDown, wasActionPressed } from "../../game/input/bindings";
import type { GameStore } from "../../game/simulation/systems/gameStore";
import type { GameState } from "../../game/simulation/types";
import {
  acceptSelectedQuest,
  canTraverseTo,
  createInteractables,
  createPortals,
  type InteractableInstance,
  type PortalDefinition,
} from "../adapters/sceneBridge";
import { palette } from "../view/palette";
import { ensureAnimations, ensureProceduralTextures } from "../view/proceduralTextures";

const WORLD_WIDTH = 1200;
const WORLD_HEIGHT = 720;

type Facing = "down" | "left" | "right" | "up";
interface ActiveHazard {
  config: ZoneHazard;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  patrolIndex: number;
}

function zoneTint(location: BuildingId): number {
  switch (location) {
    case "campus":
      return palette.campusGrass;
    case "library":
      return palette.library;
    case "north-hall":
      return palette.northHall;
    case "north-hall-archive-room":
      return 0x243544;
    case "south-hall":
      return palette.southHall;
    case "main-hall":
      return palette.mainHall;
  }
}

export class GameplayScene extends Phaser.Scene {
  private store: GameStore;
  private state!: GameState;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private player!: Phaser.GameObjects.Sprite;
  private archiveBackdrop?: Phaser.GameObjects.Image;
  private archiveReticle?: Phaser.GameObjects.Arc;
  private zoneLabel!: Phaser.GameObjects.Text;
  private hintLabel!: Phaser.GameObjects.Text;
  private bindings!: ReturnType<typeof createInputBindings>;
  private portals: PortalDefinition[] = [];
  private interactables: InteractableInstance[] = [];
  private drawings: Phaser.GameObjects.GameObject[] = [];
  private hazards: ActiveHazard[] = [];
  private searchPulseLevel = 0;
  private searchPulseGraphic?: Phaser.GameObjects.Arc;
  private searchPulseTween?: Phaser.Tweens.Tween;
  private archiveTarget = { x: 806, y: 494 };
  private facing: Facing = "down";
  private airborne = false;
  private actionLocked = false;
  private damageCooldownUntil = 0;

  constructor(store: GameStore) {
    super("gameplay");
    this.store = store;
  }

  create(): void {
    ensureProceduralTextures(this);
    ensureAnimations(this);

    this.cameras.main.setBackgroundColor("#10212a");
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.bindings = createInputBindings(this);

    this.zoneLabel = this.add.text(24, 22, "", {
      color: palette.text,
      fontFamily: "Georgia",
      fontSize: "28px",
    }).setScrollFactor(0);

    this.hintLabel = this.add.text(24, 54, "", {
      color: "#afc4ba",
      fontFamily: "Georgia",
      fontSize: "14px",
    }).setScrollFactor(0);

    this.playerShadow = this.add.ellipse(0, 0, 20, 9, 0x000000, 0.18);
    this.player = this.add.sprite(0, 0, "player-sheet", 0).setScale(1.35);
    this.player.play("player-idle-down");
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);

    this.store.subscribe((nextState) => {
      const locationChanged = !this.state || this.state.player.location !== nextState.player.location;
      const archiveRevealChanged =
        !locationChanged &&
        nextState.player.location === "north-hall-archive-room" &&
        this.state?.flags.includes("quest:archive-box-17:box-revealed") !== nextState.flags.includes("quest:archive-box-17:box-revealed");
      const archiveRecoveryChanged =
        !locationChanged &&
        nextState.player.location === "north-hall-archive-room" &&
        this.state?.flags.includes("quest:archive-box-17:box-recovered") !== nextState.flags.includes("quest:archive-box-17:box-recovered");
      this.state = nextState;
      this.syncPlayer();
      if (locationChanged || archiveRecoveryChanged) {
        this.rebuildZone();
      } else if (archiveRevealChanged) {
        this.renderArchiveReveal();
      }
      this.hintLabel.setText(this.state.ui.message);
    });

    this.rebuildZone();
  }

  update(_time: number, deltaMs: number): void {
    const running = isActionDown(this.bindings, "run");
    const speed = (running ? 0.34 : 0.2) * deltaMs;
    let dx = 0;
    let dy = 0;

    if (!this.actionLocked) {
      if (isActionDown(this.bindings, "move-left")) {
        dx -= speed;
        this.facing = "left";
      }
      if (isActionDown(this.bindings, "move-right")) {
        dx += speed;
        this.facing = "right";
      }
      if (isActionDown(this.bindings, "move-up")) {
        dy -= speed;
        this.facing = "up";
      }
      if (isActionDown(this.bindings, "move-down")) {
        dy += speed;
        this.facing = "down";
      }
    }

    if (!this.airborne && wasActionPressed(this.bindings, "jump")) {
      this.playJump();
    }

    if (wasActionPressed(this.bindings, "search-pulse")) {
      this.triggerSearchPulse();
    }

    if (dx !== 0 || dy !== 0) {
      if (this.isFirstPersonArchiveRoom()) {
        const constrained = this.constrainArchiveRoomFocus({
          x: this.state.player.position.x + dx,
          y: this.state.player.position.y + dy,
        });
        this.store.movePlayer(constrained.x - this.state.player.position.x, constrained.y - this.state.player.position.y);
      } else {
        this.store.movePlayer(dx, dy);
      }
    }

    if (wasActionPressed(this.bindings, "toggle-quest-board")) {
      this.store.toggleQuestBoard();
    }
    if (wasActionPressed(this.bindings, "toggle-debug")) {
      this.store.toggleDebugPanel();
    }
    if (wasActionPressed(this.bindings, "interact")) {
      this.playInteract();
      this.tryInteract();
    }

    this.updateHazards(deltaMs);
    this.updateMovementAnimation(dx, dy, running);
  }

  private syncPlayer(): void {
    const { x, y } = this.state.player.position;
    const firstPersonRoom = this.isFirstPersonArchiveRoom();
    this.player.setPosition(x, y - (this.airborne ? 10 : 0));
    this.playerShadow.setPosition(x, y + 10);
    this.player.setVisible(!firstPersonRoom);
    this.playerShadow.setVisible(!firstPersonRoom);
    if (this.archiveReticle) {
      this.archiveReticle.setPosition(x, y);
      this.archiveReticle.setVisible(firstPersonRoom);
    }
    if (firstPersonRoom) {
      this.updateArchiveRoomPresentation();
    }
  }

  private rebuildZone(): void {
    for (const drawing of this.drawings) {
      drawing.destroy();
    }
    this.drawings = [];

    const location = this.state.player.location;
    this.searchPulseLevel = 0;
    this.archiveBackdrop = undefined;
    this.archiveReticle = undefined;
    this.searchPulseTween?.stop();
    this.searchPulseTween = undefined;
    this.searchPulseGraphic?.destroy();
    this.searchPulseGraphic = undefined;
    const background = this.add.rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT, zoneTint(location)).setOrigin(0);
    this.drawings.push(background);

    if (location === "campus") {
      this.drawCampus();
    } else if (location === "north-hall-archive-room") {
      this.drawArchiveRoom();
    } else {
      this.drawInterior(location);
    }

    if (location !== "north-hall-archive-room") {
      this.drawProps(location);
      this.drawNpcs(location);
      this.drawLandmarks(location);
    }
    this.spawnHazards(location);

    this.zoneLabel.setText(this.state.player.location.replace("-", " ").toUpperCase());
    this.portals = createPortals(this.store, location);
    this.interactables = createInteractables(this.store, location);

    if (location === "north-hall-archive-room") {
      this.drawArchiveRoomMarkers();
    } else {
      for (const portal of this.portals) {
        const marker = this.add.circle(portal.x, portal.y, 44, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.32);
        const pulse = this.add.circle(portal.x, portal.y, 30, 0xd7bb63, 0.18).setStrokeStyle(1, 0xd7bb63, 0.35);
        this.tweens.add({
          targets: pulse,
          scale: 1.25,
          alpha: 0.05,
          duration: 1400,
          yoyo: true,
          repeat: -1,
        });
        const label = this.add.text(portal.x - 56, portal.y - 12, portal.label, {
          color: palette.text,
          fontFamily: "Georgia",
          fontSize: "15px",
        });
        this.drawings.push(marker, pulse, label);
      }

      for (const interactable of this.interactables) {
        const marker = this.add.circle(interactable.x, interactable.y, interactable.radius, 0xe7d078, 0.1).setStrokeStyle(2, 0xe7d078, 0.45);
        const label = this.add.text(interactable.x - 72, interactable.y - 30, interactable.label, {
          color: "#f8e5a4",
          fontFamily: "Georgia",
          fontSize: "15px",
        });
        this.drawings.push(marker, label);
      }
    }

    this.children.bringToTop(this.playerShadow);
    this.children.bringToTop(this.player);
    if (this.archiveReticle) {
      this.children.bringToTop(this.archiveReticle);
    }
    this.children.bringToTop(this.zoneLabel);
    this.children.bringToTop(this.hintLabel);
    this.syncPlayer();
  }

  private drawCampus(): void {
    const northLawn = this.add.rectangle(0, 0, WORLD_WIDTH, 235, 0x274636, 0.38).setOrigin(0);
    const centralPath = this.add.rectangle(510, 110, 180, 430, palette.campusPath, 0.94).setOrigin(0);
    const westPath = this.add.rectangle(215, 275, 315, 110, 0xb59468, 0.92).setOrigin(0);
    const eastPath = this.add.rectangle(690, 275, 285, 110, 0xb59468, 0.92).setOrigin(0);
    const southLoop = this.add.ellipse(600, 555, 305, 138, 0x44674e, 0.96).setStrokeStyle(3, 0x668873, 0.5);
    const quad = this.add.rectangle(430, 118, 340, 130, 0x304f3c, 0.78).setOrigin(0).setStrokeStyle(3, 0x678c73, 0.6);
    const libraryBlock = this.add.rectangle(175, 245, 205, 128, 0x31465b).setStrokeStyle(4, 0xc9c29f, 0.28);
    const northBlock = this.add.rectangle(165, 95, 200, 108, 0x5f3d57).setStrokeStyle(4, 0xe1cad6, 0.2);
    const mainBlock = this.add.rectangle(470, 38, 260, 118, 0x4f2946).setStrokeStyle(4, 0xf3e8d7, 0.25);
    const southBlock = this.add.rectangle(810, 245, 210, 128, 0x5a4331).setStrokeStyle(4, 0xe1d1b7, 0.22);
    const pond = this.add.ellipse(980, 150, 150, 85, 0x284764, 0.95);
    const note = this.add.text(52, 625, "Main Hall is the anchor, with North Hall to the northwest, Library/IT to the west, South Hall to the east, and the Oval tying the campus together.", {
      color: "#edf6ef",
      fontFamily: "Georgia",
      fontSize: "18px",
      wordWrap: { width: 680 },
    });
    this.drawings.push(northLawn, centralPath, westPath, eastPath, southLoop, quad, libraryBlock, northBlock, southBlock, mainBlock, pond, note);
  }

  private drawInterior(location: BuildingId): void {
    if (location === "library") {
      this.drawLibraryInterior();
      return;
    }

    const room = this.add.rectangle(70, 70, 1060, 580, 0xf4e9cf, 0.08).setOrigin(0).setStrokeStyle(3, 0xf4e9cf, 0.2);
    const divider = this.add.rectangle(285, 70, 20, 580, zoneTint(location), 0.52).setOrigin(0);
    const hallRunner = this.add.rectangle(305, 260, 770, 80, 0xffffff, 0.05).setOrigin(0);
    const sidePanel = this.add.rectangle(90, 115, 150, 470, 0x000000, 0.08).setOrigin(0);
    const loreLabel = this.add.text(350, 115, interiorCaption(location), {
      color: "#edf6ef",
      fontFamily: "Georgia",
      fontSize: "22px",
      wordWrap: { width: 660 },
    });
    this.drawings.push(room, divider, hallRunner, sidePanel, loreLabel);
    if (location === "north-hall") {
      this.drawings.push(
        this.add.rectangle(350, 190, 180, 130, 0x89617d, 0.12).setOrigin(0),
        this.add.rectangle(620, 165, 260, 110, 0x89617d, 0.1).setOrigin(0),
      );
    }

    if (location === "south-hall") {
      this.drawings.push(
        this.add.rectangle(410, 170, 340, 130, 0x8b725a, 0.12).setOrigin(0),
        this.add.rectangle(680, 325, 210, 120, 0x8b725a, 0.1).setOrigin(0),
      );
    }

    if (location === "main-hall") {
      this.drawings.push(
        this.add.ellipse(610, 340, 440, 230, 0x62384e, 0.12),
        this.add.rectangle(425, 200, 370, 260, 0xf3d9bb, 0.05).setStrokeStyle(2, 0xf3d9bb, 0.15),
      );
    }
  }

  private drawLibraryInterior(): void {
    const outer = this.add.rectangle(60, 60, 1080, 600, 0xefe7d1, 0.1).setOrigin(0).setStrokeStyle(3, 0xe3d8bd, 0.28);
    const brickBand = this.add.rectangle(90, 92, 1020, 126, 0x8c6d54, 0.34).setOrigin(0).setStrokeStyle(2, 0xdac6a7, 0.16);
    const windowBayA = this.add.rectangle(120, 110, 210, 94, 0x94b8c6, 0.3).setOrigin(0).setStrokeStyle(4, 0xd7e4ea, 0.22);
    const windowBayB = this.add.rectangle(350, 110, 210, 94, 0x94b8c6, 0.3).setOrigin(0).setStrokeStyle(4, 0xd7e4ea, 0.22);
    const windowBayC = this.add.rectangle(580, 110, 210, 94, 0x94b8c6, 0.3).setOrigin(0).setStrokeStyle(4, 0xd7e4ea, 0.22);
    const windowBayD = this.add.rectangle(810, 110, 210, 94, 0x94b8c6, 0.3).setOrigin(0).setStrokeStyle(4, 0xd7e4ea, 0.22);
    const leftVestibule = this.add.rectangle(90, 230, 188, 360, 0x172028, 0.28).setOrigin(0).setStrokeStyle(2, 0xaab7bf, 0.18);
    const vestibuleGlass = this.add.rectangle(118, 260, 130, 150, 0x9ac2cf, 0.22).setOrigin(0).setStrokeStyle(3, 0xd2e6ee, 0.18);
    const circulationDesk = this.add.rectangle(520, 255, 310, 68, 0x705844, 0.82).setOrigin(0).setStrokeStyle(2, 0xe8d2b0, 0.25);
    const circulationTop = this.add.rectangle(520, 255, 310, 18, 0xa7825f, 0.95).setOrigin(0);
    const readingTableA = this.add.rectangle(420, 430, 156, 72, 0x735744, 0.82).setStrokeStyle(2, 0xd9c09b, 0.22);
    const readingTableB = this.add.rectangle(640, 430, 156, 72, 0x735744, 0.82).setStrokeStyle(2, 0xd9c09b, 0.22);
    const stackWallA = this.add.rectangle(870, 260, 180, 84, 0x433a31, 0.84).setOrigin(0).setStrokeStyle(2, 0xcbba98, 0.16);
    const stackWallB = this.add.rectangle(870, 365, 180, 84, 0x433a31, 0.84).setOrigin(0).setStrokeStyle(2, 0xcbba98, 0.16);
    const cShopNook = this.add.rectangle(845, 515, 220, 88, 0x4e5e50, 0.55).setOrigin(0).setStrokeStyle(2, 0xd6cbac, 0.14);
    const archiveStair = this.add.polygon(0, 0, [235, 520, 318, 520, 360, 430, 278, 430], 0x666674, 0.58).setOrigin(0).setStrokeStyle(2, 0xd9d7cb, 0.22);
    const rug = this.add.rectangle(603, 540, 475, 95, 0x4a5c71, 0.22).setStrokeStyle(2, 0xd5c6a8, 0.14);
    const caption = this.add.text(330, 110, "Olive Kettering Library\n1950s mid-century exterior glazing, a circulation-centered main floor, and Antiochiana up above.", {
      color: "#edf6ef",
      fontFamily: "Georgia",
      fontSize: "22px",
      wordWrap: { width: 650 },
    });
    const stairLabel = this.add.text(192, 452, "ANTIOCHIANA\nUPSTAIRS", {
      color: "#efe1bf",
      fontFamily: "Georgia",
      fontSize: "20px",
      align: "center",
    });
    const cShopLabel = this.add.text(886, 536, "C-SHOP / STUDENT COMMONS", {
      color: "#eef2dc",
      fontFamily: "Georgia",
      fontSize: "16px",
    });
    const deskLabel = this.add.text(575, 243, "CIRCULATION / REFERENCE", {
      color: "#f2e4c1",
      fontFamily: "Georgia",
      fontSize: "16px",
    });

    this.drawings.push(
      outer,
      brickBand,
      windowBayA,
      windowBayB,
      windowBayC,
      windowBayD,
      leftVestibule,
      vestibuleGlass,
      circulationDesk,
      circulationTop,
      readingTableA,
      readingTableB,
      stackWallA,
      stackWallB,
      cShopNook,
      archiveStair,
      rug,
      caption,
      stairLabel,
      cShopLabel,
      deskLabel,
    );

    for (let i = 0; i < 5; i += 1) {
      this.drawings.push(this.add.rectangle(890 + i * 28, 292, 16, 46, 0xb89b6d, 0.58).setOrigin(0));
      this.drawings.push(this.add.rectangle(890 + i * 28, 397, 16, 46, 0x9d8c6b, 0.58).setOrigin(0));
    }

    for (let i = 0; i < 6; i += 1) {
      this.drawings.push(this.add.rectangle(458 + i * 16, 418, 10, 34, 0xe5dfcf, 0.25).setStrokeStyle(1, 0xd7cfbe, 0.16));
      this.drawings.push(this.add.rectangle(678 + i * 16, 418, 10, 34, 0xe5dfcf, 0.25).setStrokeStyle(1, 0xd7cfbe, 0.16));
    }
  }

  private drawArchiveRoom(): void {
    const backdrop = this.add.image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, assetManifest.archiveRoomBackdrop).setDisplaySize(1320, 792);
    this.archiveBackdrop = backdrop;
    const topShade = this.add.rectangle(600, 86, 1200, 172, 0x050403, 0.3);
    const floorShade = this.add.rectangle(600, 636, 1200, 168, 0x0a0907, 0.42);
    const leftWallMask = this.add.polygon(0, 0, [0, 0, 210, 0, 156, 720, 0, 720], 0x000000, 0.24).setOrigin(0);
    const rightWallMask = this.add.polygon(0, 0, [990, 0, 1200, 0, 1200, 720, 1058, 720], 0x000000, 0.22).setOrigin(0);
    const leftShelfMask = this.add.polygon(0, 0, [0, 0, 196, 0, 168, 520, 42, 560], 0x1a140f, 0.38).setOrigin(0);
    const mapBoardMask = this.add.rectangle(595, 290, 510, 254, 0x090807, 0.12).setStrokeStyle(2, 0xe4c783, 0.08);
    const cabinetMask = this.add.rectangle(1026, 492, 196, 278, 0x0f0f0d, 0.18).setStrokeStyle(2, 0xe4c783, 0.08);
    const shelfFocus = this.add.ellipse(this.archiveTarget.x, this.archiveTarget.y + 4, 222, 94, 0xf7dd8e, 0.05).setStrokeStyle(2, 0xf4da90, 0.14);
    const instructionPanel = this.add.rectangle(600, 650, 900, 74, 0x101820, 0.58).setStrokeStyle(2, 0xe2bf7a, 0.16);
    const note = this.add.text(168, 625, "First-person archive search: move your focus through the room, press F to sweep the shelves, then interact once Box 17 starts glowing.", {
      color: "#edf6ef",
      fontFamily: "Georgia",
      fontSize: "18px",
      wordWrap: { width: 820 },
    });
    const reticle = this.add.circle(this.state.player.position.x, this.state.player.position.y, 18, 0x000000, 0).setStrokeStyle(2, 0xf6df9b, 0.9);
    this.archiveReticle = reticle;
    this.drawings.push(backdrop, topShade, floorShade, leftWallMask, rightWallMask, leftShelfMask, mapBoardMask, cabinetMask, shelfFocus, instructionPanel, note, reticle);

    this.updateArchiveRoomPresentation();
    this.renderArchiveReveal();
  }

  private drawArchiveRoomMarkers(): void {
    for (const portal of this.portals) {
      const doorway = this.add.rectangle(portal.x, portal.y, 116, 54, 0xd7bb63, 0.09).setStrokeStyle(2, 0xd7bb63, 0.28);
      const label = this.add.text(portal.x - 54, portal.y - 12, portal.label, {
        color: "#f2e4bf",
        fontFamily: "Georgia",
        fontSize: "15px",
      });
      this.drawings.push(doorway, label);
    }

    for (const interactable of this.interactables) {
      const marker = this.add.ellipse(interactable.x, interactable.y, interactable.radius * 1.7, interactable.radius * 1.1, 0xe7d078, 0.05)
        .setStrokeStyle(2, 0xe7d078, interactable.id === "archive-box-17-revealed" ? 0.2 : 0.1);
      const label = this.add.text(interactable.x - 58, interactable.y - 28, interactable.label, {
        color: "#f8e5a4",
        fontFamily: "Georgia",
        fontSize: "14px",
      });
      this.drawings.push(marker, label);
    }
  }

  private updateArchiveRoomPresentation(): void {
    if (!this.archiveBackdrop) {
      return;
    }

    const normalizedX = (this.state.player.position.x - WORLD_WIDTH / 2) / (WORLD_WIDTH / 2);
    const normalizedY = (this.state.player.position.y - WORLD_HEIGHT / 2) / (WORLD_HEIGHT / 2);
    this.archiveBackdrop.setPosition(
      WORLD_WIDTH / 2 - normalizedX * 34,
      WORLD_HEIGHT / 2 - normalizedY * 20,
    );
  }

  private constrainArchiveRoomFocus(position: { x: number; y: number }): { x: number; y: number } {
    const clamped = {
      x: Phaser.Math.Clamp(position.x, 130, 1085),
      y: Phaser.Math.Clamp(position.y, 150, 635),
    };

    const blockedZones = [
      new Phaser.Geom.Rectangle(0, 0, 140, 720),
      new Phaser.Geom.Rectangle(1080, 0, 120, 720),
      new Phaser.Geom.Rectangle(350, 164, 460, 160),
    ];

    if (blockedZones.some((zone) => Phaser.Geom.Rectangle.Contains(zone, clamped.x, clamped.y))) {
      return {
        x: Phaser.Math.Clamp(this.state.player.position.x, 130, 1085),
        y: Phaser.Math.Clamp(this.state.player.position.y, 150, 635),
      };
    }

    return clamped;
  }

  private isFirstPersonArchiveRoom(): boolean {
    return this.state.player.location === "north-hall-archive-room";
  }

  private renderArchiveReveal(): void {
    this.drawings = this.drawings.filter((drawing) => {
      if (drawing.getData("archiveReveal")) {
        drawing.destroy();
        return false;
      }
      return true;
    });

    if (
      this.state.player.location !== "north-hall-archive-room" ||
      !this.state.flags.includes("quest:archive-box-17:box-revealed") ||
      this.state.flags.includes("quest:archive-box-17:box-recovered")
    ) {
      return;
    }

    const glow = this.add.circle(this.archiveTarget.x, this.archiveTarget.y, 20, 0xe7d078, 0.24).setStrokeStyle(2, 0xfbf0af, 0.85);
    const beam = this.add.ellipse(this.archiveTarget.x, this.archiveTarget.y + 10, 108, 44, 0xf2d88f, 0.08).setStrokeStyle(1, 0xfbf0af, 0.2);
    const box = this.add.rectangle(this.archiveTarget.x, this.archiveTarget.y, 22, 18, 0xe7d078, 0.95).setStrokeStyle(2, 0xfaf2c8, 0.74);
    glow.setData("archiveReveal", true);
    beam.setData("archiveReveal", true);
    box.setData("archiveReveal", true);
    this.tweens.add({
      targets: glow,
      alpha: 0.08,
      scale: 1.22,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    this.tweens.add({
      targets: beam,
      alpha: 0.02,
      scaleX: 1.18,
      scaleY: 1.08,
      duration: 920,
      yoyo: true,
      repeat: -1,
    });
    this.drawings.push(beam, glow, box);
  }

  private drawProps(location: BuildingId): void {
    for (const prop of zoneProps.filter((entry) => entry.zone === location)) {
      const sprite = this.add.image(prop.x, prop.y, textureForProp(prop.kind)).setScale(prop.scale ?? 1);
      if (prop.label) {
        const label = this.add.text(prop.x - 40, prop.y + 24, prop.label, {
          color: "#d6dfdd",
          fontFamily: "Georgia",
          fontSize: "12px",
        });
        this.drawings.push(label);
      }
      this.drawings.push(sprite);
    }
  }

  private drawNpcs(location: BuildingId): void {
    for (const npc of zoneNpcs.filter((entry) => entry.zone === location)) {
      const shadow = this.add.ellipse(npc.x, npc.y + 12, 18, 8, 0x000000, 0.16);
      const sprite = this.add.sprite(npc.x, npc.y, `npc-${npc.palette}`).setScale(1.15);
      sprite.play(`npc-${npc.palette}-idle`);
      const name = this.add.text(npc.x - 42, npc.y + 18, npc.name, {
        color: "#eff5f2",
        fontFamily: "Georgia",
        fontSize: "13px",
      });
      this.drawings.push(shadow, sprite, name);
    }
  }

  private drawLandmarks(location: BuildingId): void {
    for (const landmark of zoneLandmarks.filter((entry) => entry.zone === location)) {
      const label = this.add.text(landmark.x - 65, landmark.y, landmark.title, {
        color: "#f3e2a5",
        fontFamily: "Georgia",
        fontSize: "14px",
        fontStyle: "italic",
      });
      this.drawings.push(label);
    }
  }

  private spawnHazards(location: BuildingId): void {
    this.hazards = [];
    for (const hazard of zoneHazards.filter((entry) => entry.zone === location)) {
      const sprite = this.add.image(hazard.x, hazard.y, textureForHazard(hazard.type)).setScale(hazard.type === "goose" || hazard.type === "squirrel" ? 1.1 : 1.2);
      const label = this.add.text(hazard.x - 45, hazard.y + 22, labelForHazard(hazard.type), {
        color: "#ffd7b3",
        fontFamily: "Georgia",
        fontSize: "12px",
      });
      this.drawings.push(sprite, label);
      this.hazards.push({
        config: hazard,
        sprite,
        label,
        patrolIndex: 1 % hazard.patrolPoints.length,
      });
    }
  }

  private updateHazards(deltaMs: number): void {
    if (this.hazards.length === 0) {
      return;
    }

    const playerPosition = this.state.player.position;
    for (const hazard of this.hazards) {
      const current = new Phaser.Math.Vector2(hazard.sprite.x, hazard.sprite.y);
      const playerDistance = Phaser.Math.Distance.Between(current.x, current.y, playerPosition.x, playerPosition.y);
      const chasing = playerDistance < hazard.config.detectionRadius;
      let target = chasing
        ? new Phaser.Math.Vector2(playerPosition.x, playerPosition.y)
        : new Phaser.Math.Vector2(
            hazard.config.patrolPoints[hazard.patrolIndex].x,
            hazard.config.patrolPoints[hazard.patrolIndex].y,
          );

      if (!chasing && Phaser.Math.Distance.Between(current.x, current.y, target.x, target.y) < 8) {
        hazard.patrolIndex = (hazard.patrolIndex + 1) % hazard.config.patrolPoints.length;
        target = new Phaser.Math.Vector2(
          hazard.config.patrolPoints[hazard.patrolIndex].x,
          hazard.config.patrolPoints[hazard.patrolIndex].y,
        );
      }

      const step = (hazard.config.speed * deltaMs) / 1000;
      const lerpFactor = Math.min(
        1,
        step / Math.max(1, Phaser.Math.Distance.Between(current.x, current.y, target.x, target.y)),
      );
      const next = current.clone().lerp(target, lerpFactor);
      hazard.sprite.setPosition(next.x, next.y);
      hazard.label.setPosition(next.x - 45, next.y + 22);

      const collisionRadius = hazard.config.type === "goose" || hazard.config.type === "squirrel" ? 24 : 28;
      if (this.time.now > this.damageCooldownUntil && Phaser.Math.Distance.Between(next.x, next.y, playerPosition.x, playerPosition.y) < collisionRadius) {
        this.damageCooldownUntil = this.time.now + 900;
        const angle = Phaser.Math.Angle.Between(next.x, next.y, playerPosition.x, playerPosition.y);
        const knockback = 58;
        this.store.applyHazardImpact(
          {
            x: Phaser.Math.Clamp(playerPosition.x + Math.cos(angle) * knockback, 40, 1160),
            y: Phaser.Math.Clamp(playerPosition.y + Math.sin(angle) * knockback, 40, 680),
          },
          hazard.config.hint,
        );
        this.player.setTintFill(0xffffff);
        this.time.delayedCall(140, () => this.player.clearTint());
      }
    }
  }

  private triggerSearchPulse(): void {
    if (this.state.player.location !== "north-hall-archive-room") {
      return;
    }

    this.searchPulseLevel = Math.min(this.searchPulseLevel + 1, 5);
    const radius = 55 + this.searchPulseLevel * 28;
    this.searchPulseTween?.stop();
    this.searchPulseTween = undefined;
    this.searchPulseGraphic?.destroy();
    const pulseGraphic = this.add.circle(this.player.x, this.player.y, 12, 0x75dfe0, 0.08).setStrokeStyle(3, 0x75dfe0, 0.42);
    this.searchPulseGraphic = pulseGraphic;
    this.children.bringToTop(pulseGraphic);
    this.searchPulseTween = this.tweens.add({
      targets: pulseGraphic,
      radius,
      alpha: 0,
      duration: 320,
      onComplete: () => {
        if (this.searchPulseGraphic === pulseGraphic) {
          this.searchPulseGraphic.destroy();
          this.searchPulseGraphic = undefined;
        } else {
          pulseGraphic.destroy();
        }
        this.searchPulseTween = undefined;
      },
    });

    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.archiveTarget.x, this.archiveTarget.y);
    if (!this.state.flags.includes("quest:archive-box-17:box-revealed") && distance <= radius) {
      this.store.completeObjective(
        "quest:archive-box-17:box-revealed",
        "Your search pulse catches a response on Shelf C. The right object starts to glow behind the false backing.",
      );
      return;
    }

    this.store.setMessage(`Search pulse expanded to radius ${radius}. Sweep the shelves and try again.`);
  }

  private updateMovementAnimation(dx: number, dy: number, running: boolean): void {
    if (this.isFirstPersonArchiveRoom()) {
      return;
    }

    if (this.actionLocked || this.airborne) {
      return;
    }

    const moving = dx !== 0 || dy !== 0;
    const state = moving ? (running ? "run" : "walk") : "idle";
    const key = `player-${state}-${this.facing}`;

    if (this.player.anims.currentAnim?.key !== key) {
      this.player.play(key, true);
    }
  }

  private playJump(): void {
    if (this.isFirstPersonArchiveRoom()) {
      return;
    }

    if (this.airborne) {
      return;
    }

    this.airborne = true;
    this.player.play(`player-jump-${this.facing}`, true);
    this.tweens.add({
      targets: this.player,
      y: this.player.y - 16,
      duration: 150,
      yoyo: true,
      ease: "Quad.Out",
      onUpdate: () => {
        this.playerShadow.setScale(this.player.scaleX * 0.9, 1);
      },
      onComplete: () => {
        this.airborne = false;
        this.playerShadow.setScale(1, 1);
        this.syncPlayer();
      },
    });
  }

  private playInteract(): void {
    if (this.isFirstPersonArchiveRoom()) {
      return;
    }

    if (this.actionLocked) {
      return;
    }

    this.actionLocked = true;
    this.player.play(`player-interact-${this.facing}`, true);
    this.time.delayedCall(240, () => {
      this.actionLocked = false;
    });
  }

  private tryInteract(): void {
    const playerPoint = new Phaser.Math.Vector2(this.player.x, this.player.y);

    const portal = this.portals.find((entry) =>
      Phaser.Math.Distance.BetweenPoints(playerPoint, entry) < 80,
    );
    if (portal) {
      const traversal = canTraverseTo(this.store, portal.target);
      if (!traversal.ok) {
        this.store.setMessage(traversal.reason ?? "That route is currently unavailable.");
        return;
      }
      this.store.setPlayerLocation(portal.target, zoneSpawn(portal.target));
      return;
    }

    const interactable = this.interactables.find((entry) =>
      Phaser.Math.Distance.BetweenPoints(playerPoint, entry) < entry.radius + 30,
    );
    if (interactable) {
      interactable.onInteract();
      return;
    }

    const npc = zoneNpcs
      .filter((entry) => entry.zone === this.state.player.location)
      .find((entry) => Phaser.Math.Distance.Between(playerPoint.x, playerPoint.y, entry.x, entry.y) < 80);
    if (npc) {
      this.store.setMessage(`${npc.name}: ${npc.dialogue}`);
      return;
    }

    const landmark = zoneLandmarks
      .filter((entry) => entry.zone === this.state.player.location)
      .find((entry) => Phaser.Math.Distance.Between(playerPoint.x, playerPoint.y, entry.x, entry.y) < 110);
    if (landmark) {
      this.store.setMessage(`${landmark.title}: ${landmark.body}`);
      return;
    }

    if (this.state.player.location === "library") {
      acceptSelectedQuest(this.store);
    } else {
      this.store.setMessage("Nothing nearby responds. The campus is weird, not generous.");
    }
  }
}

function textureForProp(kind: ZoneProp["kind"]): string {
  switch (kind) {
    case "tree":
      return "prop-tree";
    case "lamp":
      return "prop-lamp";
    case "bench":
      return "prop-bench";
    case "crate":
      return "prop-crate";
    case "terminal":
      return "prop-terminal";
    case "banner":
      return "prop-banner";
    case "statue":
      return "prop-statue";
    case "rack":
      return "prop-rack";
    case "stage":
      return "prop-stage";
    case "desk":
      return "prop-desk";
  }
}

function textureForHazard(type: ZoneHazard["type"]): string {
  switch (type) {
    case "goose":
      return "hazard-goose";
    case "squirrel":
      return "hazard-squirrel";
    case "faculty":
      return "hazard-faculty";
    case "staff":
      return "hazard-staff";
  }
}

function labelForHazard(type: ZoneHazard["type"]): string {
  switch (type) {
    case "goose":
      return "Aggro Goose";
    case "squirrel":
      return "Route Squirrel";
    case "faculty":
      return "Faculty Aggro";
    case "staff":
      return "Staff Aggro";
  }
}

function zoneSpawn(location: BuildingId): { x: number; y: number } {
  switch (location) {
    case "campus":
      return { x: 590, y: 380 };
    case "library":
      return { x: 950, y: 580 };
    case "north-hall":
      return { x: 950, y: 580 };
    case "north-hall-archive-room":
      return { x: 300, y: 500 };
    case "south-hall":
      return { x: 220, y: 220 };
    case "main-hall":
      return { x: 930, y: 580 };
  }
}

function interiorCaption(location: BuildingId): string {
  switch (location) {
    case "library":
      return "Olive Kettering Library\nA circulation-centered library floor with public catalog access, student commons energy, and Antiochiana overhead.";
    case "north-hall":
      return "North Hall\nDorm lounge pockets, rumor corners, and suspicious radiator caches make the building feel lived in.";
    case "north-hall-archive-room":
      return "North Hall Archive Room\nA compact pseudo-3D side space like an old VRML memory. Search the shelf depth instead of clicking the answer.";
    case "south-hall":
      return "South Hall\nAdministrative desks, badge infrastructure, and brittle hallway order make this read like an office dungeon.";
    case "main-hall":
      return "Main Hall\nThe stage, banners, and backstage hints establish the ceremonial destination without overbuilding it yet.";
    case "campus":
      return "Campus";
  }
}
