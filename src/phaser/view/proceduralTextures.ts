import Phaser from "phaser";

const PLAYER_FRAME = 32;
const NPC_FRAME = 28;

function createCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
): Phaser.Textures.CanvasTexture | null {
  const texture = scene.textures.createCanvas(key, width, height);
  return texture ?? null;
}

function getCanvas(texture: Phaser.Textures.CanvasTexture): HTMLCanvasElement {
  return texture.getSourceImage() as HTMLCanvasElement;
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

function drawPlayerFrame(
  ctx: CanvasRenderingContext2D,
  frame: number,
  direction: number,
): void {
  const x = frame * PLAYER_FRAME;
  const y = direction * PLAYER_FRAME;
  const stride = frame % 4;
  const bodyOffset = stride === 1 ? -1 : stride === 3 ? 1 : 0;
  const armSwing = stride === 0 ? 0 : stride === 1 ? -2 : stride === 2 ? 0 : 2;
  const jumpLift = frame >= 8 && frame <= 11 ? -4 : 0;
  const interactPose = frame >= 12 ? 3 : 0;
  const coatColor = direction === 0 ? "#d7bb63" : direction === 1 ? "#77c0e6" : direction === 2 ? "#87d67f" : "#d58ca2";
  const scarfColor = direction === 0 ? "#7d3f35" : direction === 1 ? "#314c70" : direction === 2 ? "#42603a" : "#6e4268";

  ctx.clearRect(x, y, PLAYER_FRAME, PLAYER_FRAME);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x + 16, y + 26, 8, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f0d4ad";
  ctx.beginPath();
  ctx.arc(x + 16, y + 9 + jumpLift, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#203041";
  ctx.beginPath();
  ctx.moveTo(x + 11, y + 5 + jumpLift);
  ctx.lineTo(x + 22, y + 5 + jumpLift);
  ctx.lineTo(x + 19, y + 2 + jumpLift);
  ctx.lineTo(x + 13, y + 2 + jumpLift);
  ctx.closePath();
  ctx.fill();

  fillRoundedRect(ctx, x + 10, y + 13 + jumpLift + bodyOffset, 12, 11, 4, coatColor);
  fillRoundedRect(ctx, x + 11, y + 13 + jumpLift + bodyOffset, 10, 3, 2, scarfColor);
  fillRoundedRect(ctx, x + 11, y + 24 + jumpLift, 4, 6, 2, "#35282a");
  fillRoundedRect(ctx, x + 17, y + 24 + jumpLift, 4, 6, 2, "#35282a");
  fillRoundedRect(ctx, x + 7 - armSwing, y + 15 + jumpLift, 4, 10, 2, "#f0d4ad");
  fillRoundedRect(ctx, x + 21 + armSwing + interactPose, y + 15 + jumpLift, 4, 10, 2, "#f0d4ad");
  fillRoundedRect(ctx, x + 20 + interactPose, y + 18 + jumpLift, 4, 4, 2, "#e8e2cf");
  fillRoundedRect(ctx, x + 8, y + 18 + jumpLift, 3, 6, 2, "#6d4d2e");
  fillRoundedRect(ctx, x + 11, y + 17 + jumpLift, 2, 7, 1, "#8e6a42");

  ctx.fillStyle = "#2b1c1d";
  ctx.fillRect(x + 13, y + 10 + jumpLift, 1, 1);
  ctx.fillRect(x + 18, y + 10 + jumpLift, 1, 1);
  if (direction === 0) {
    ctx.fillRect(x + 15, y + 13 + jumpLift, 2, 1);
  }
}

function drawNpcFrame(
  ctx: CanvasRenderingContext2D,
  frame: number,
  colors: { outfit: string; accent: string; hair: string; accessory: string },
): void {
  const x = frame * NPC_FRAME;
  ctx.clearRect(x, 0, NPC_FRAME, NPC_FRAME);
  const sway = frame % 2 === 0 ? -1 : 1;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.beginPath();
  ctx.ellipse(x + 14, 24, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#edc8a0";
  ctx.beginPath();
  ctx.arc(x + 14, 9, 4.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.hair;
  ctx.fillRect(x + 10, 4, 8, 4);
  fillRoundedRect(ctx, x + 9, 13 + sway, 10, 9, 3, colors.outfit);
  fillRoundedRect(ctx, x + 10, 13 + sway, 8, 2, 1, colors.accessory);
  fillRoundedRect(ctx, x + 7, 14, 3, 8, 2, "#edc8a0");
  fillRoundedRect(ctx, x + 18, 14, 3, 8, 2, "#edc8a0");
  fillRoundedRect(ctx, x + 11, 21, 3, 6, 2, colors.accent);
  fillRoundedRect(ctx, x + 15, 21, 3, 6, 2, colors.accent);
  ctx.fillStyle = "#2a1d20";
  ctx.fillRect(x + 12, 9, 1, 1);
  ctx.fillRect(x + 16, 9, 1, 1);
  if (frame % 2 === 0) {
    ctx.fillStyle = colors.accessory;
    ctx.fillRect(x + 6, 18, 3, 2);
  }
}

function createPropTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  painter: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) {
    return;
  }

  const texture = createCanvasTexture(scene, key, width, height);
  if (!texture) {
    return;
  }
  const canvas = getCanvas(texture);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }
  painter(ctx);
  texture.refresh();
}

export function ensureProceduralTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists("player-sheet")) {
    const texture = createCanvasTexture(scene, "player-sheet", PLAYER_FRAME * 16, PLAYER_FRAME * 4);
    if (!texture) {
      return;
    }
    const canvas = getCanvas(texture);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      for (let direction = 0; direction < 4; direction += 1) {
        for (let frame = 0; frame < 16; frame += 1) {
          drawPlayerFrame(ctx, frame, direction);
        }
      }
      for (let direction = 0; direction < 4; direction += 1) {
        for (let frame = 0; frame < 16; frame += 1) {
          texture.add(direction * 16 + frame, 0, frame * PLAYER_FRAME, direction * PLAYER_FRAME, PLAYER_FRAME, PLAYER_FRAME);
        }
      }
      texture.refresh();
    }
  }

  const npcPalettes = {
    student: { outfit: "#8fcbff", accent: "#33495c", hair: "#342f38", accessory: "#f7e3a3" },
    staff: { outfit: "#f0c770", accent: "#5f4732", hair: "#40312d", accessory: "#88d2c1" },
    archivist: { outfit: "#cab1ec", accent: "#533f70", hair: "#2f203e", accessory: "#f3d9bb" },
    admin: { outfit: "#df919d", accent: "#693640", hair: "#38252f", accessory: "#e8e2cf" },
    performer: { outfit: "#91d7bf", accent: "#305749", hair: "#283a30", accessory: "#f0c770" },
  } as const;

  for (const [key, palette] of Object.entries(npcPalettes)) {
    const textureKey = `npc-${key}`;
    if (scene.textures.exists(textureKey)) {
      continue;
    }
    const texture = createCanvasTexture(scene, textureKey, NPC_FRAME * 2, NPC_FRAME);
    if (!texture) {
      continue;
    }
    const canvas = getCanvas(texture);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      continue;
    }
    drawNpcFrame(ctx, 0, palette);
    drawNpcFrame(ctx, 1, palette);
    texture.add(0, 0, 0, 0, NPC_FRAME, NPC_FRAME);
    texture.add(1, 0, NPC_FRAME, 0, NPC_FRAME, NPC_FRAME);
    texture.refresh();
  }

  createPropTexture(scene, "prop-tree", 52, 62, (ctx) => {
    ctx.fillStyle = "#2d5b3a";
    ctx.beginPath();
    ctx.arc(26, 22, 16, 0, Math.PI * 2);
    ctx.arc(16, 28, 13, 0, Math.PI * 2);
    ctx.arc(36, 29, 13, 0, Math.PI * 2);
    ctx.fill();
    fillRoundedRect(ctx, 22, 34, 8, 20, 3, "#6d4c37");
  });

  createPropTexture(scene, "prop-bench", 42, 22, (ctx) => {
    fillRoundedRect(ctx, 5, 6, 32, 5, 2, "#77563e");
    fillRoundedRect(ctx, 8, 12, 4, 8, 2, "#503726");
    fillRoundedRect(ctx, 30, 12, 4, 8, 2, "#503726");
  });

  createPropTexture(scene, "prop-lamp", 20, 44, (ctx) => {
    fillRoundedRect(ctx, 9, 8, 2, 26, 1, "#4f5f6d");
    fillRoundedRect(ctx, 4, 5, 12, 5, 2, "#dbc977");
    ctx.fillStyle = "rgba(226, 208, 112, 0.18)";
    ctx.beginPath();
    ctx.arc(10, 11, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  createPropTexture(scene, "prop-crate", 26, 24, (ctx) => {
    fillRoundedRect(ctx, 2, 3, 22, 18, 2, "#8b6641");
    ctx.strokeStyle = "#5b4229";
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 4, 20, 16);
    ctx.beginPath();
    ctx.moveTo(3, 4);
    ctx.lineTo(23, 20);
    ctx.moveTo(23, 4);
    ctx.lineTo(3, 20);
    ctx.stroke();
  });

  createPropTexture(scene, "prop-terminal", 30, 34, (ctx) => {
    fillRoundedRect(ctx, 4, 3, 22, 16, 3, "#3b4856");
    fillRoundedRect(ctx, 7, 6, 16, 10, 2, "#75dfe0");
    fillRoundedRect(ctx, 10, 21, 10, 3, 1, "#798491");
    fillRoundedRect(ctx, 12, 24, 6, 7, 2, "#4a5460");
  });

  createPropTexture(scene, "prop-banner", 28, 42, (ctx) => {
    fillRoundedRect(ctx, 13, 2, 2, 38, 1, "#5e676f");
    fillRoundedRect(ctx, 5, 8, 18, 16, 2, "#d7bb63");
  });

  createPropTexture(scene, "prop-statue", 34, 48, (ctx) => {
    fillRoundedRect(ctx, 8, 32, 18, 10, 2, "#68747a");
    fillRoundedRect(ctx, 12, 12, 10, 20, 3, "#91a0a8");
    ctx.beginPath();
    ctx.arc(17, 9, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#91a0a8";
    ctx.fill();
  });

  createPropTexture(scene, "prop-rack", 36, 42, (ctx) => {
    fillRoundedRect(ctx, 5, 4, 26, 34, 3, "#36424f");
    fillRoundedRect(ctx, 9, 8, 18, 5, 2, "#7fdcc4");
    fillRoundedRect(ctx, 9, 16, 18, 5, 2, "#e5c86c");
    fillRoundedRect(ctx, 9, 24, 18, 5, 2, "#ef9f7f");
  });

  createPropTexture(scene, "prop-stage", 84, 36, (ctx) => {
    fillRoundedRect(ctx, 4, 12, 76, 18, 3, "#5b3145");
    fillRoundedRect(ctx, 0, 28, 84, 6, 2, "#3d2230");
  });

  createPropTexture(scene, "prop-desk", 48, 26, (ctx) => {
    fillRoundedRect(ctx, 3, 6, 42, 10, 2, "#7a5c42");
    fillRoundedRect(ctx, 7, 16, 4, 8, 2, "#543b2b");
    fillRoundedRect(ctx, 37, 16, 4, 8, 2, "#543b2b");
  });

  createPropTexture(scene, "hazard-goose", 34, 26, (ctx) => {
    fillRoundedRect(ctx, 8, 10, 16, 10, 4, "#e9ecef");
    fillRoundedRect(ctx, 20, 7, 8, 4, 2, "#e9ecef");
    fillRoundedRect(ctx, 26, 7, 5, 2, 1, "#f0b24b");
    fillRoundedRect(ctx, 10, 20, 3, 5, 1, "#d8704d");
    fillRoundedRect(ctx, 18, 20, 3, 5, 1, "#d8704d");
  });

  createPropTexture(scene, "hazard-squirrel", 30, 24, (ctx) => {
    fillRoundedRect(ctx, 8, 10, 12, 8, 4, "#7a5737");
    ctx.fillStyle = "#8d6643";
    ctx.beginPath();
    ctx.arc(20, 8, 6, 0, Math.PI * 2);
    ctx.fill();
    fillRoundedRect(ctx, 19, 4, 3, 3, 1, "#a67c52");
    fillRoundedRect(ctx, 23, 6, 3, 3, 1, "#a67c52");
  });

  createPropTexture(scene, "hazard-faculty", 30, 34, (ctx) => {
    fillRoundedRect(ctx, 10, 5, 10, 8, 4, "#e7c4a4");
    fillRoundedRect(ctx, 8, 13, 14, 12, 4, "#694463");
    fillRoundedRect(ctx, 11, 25, 3, 7, 2, "#3a2930");
    fillRoundedRect(ctx, 16, 25, 3, 7, 2, "#3a2930");
    fillRoundedRect(ctx, 7, 16, 3, 8, 2, "#e7c4a4");
    fillRoundedRect(ctx, 20, 16, 3, 8, 2, "#e7c4a4");
  });

  createPropTexture(scene, "hazard-staff", 30, 34, (ctx) => {
    fillRoundedRect(ctx, 10, 5, 10, 8, 4, "#e7c4a4");
    fillRoundedRect(ctx, 8, 13, 14, 12, 4, "#4d6a58");
    fillRoundedRect(ctx, 11, 25, 3, 7, 2, "#2e3c34");
    fillRoundedRect(ctx, 16, 25, 3, 7, 2, "#2e3c34");
    fillRoundedRect(ctx, 7, 16, 3, 8, 2, "#e7c4a4");
    fillRoundedRect(ctx, 20, 16, 3, 8, 2, "#e7c4a4");
  });
}

export function ensureAnimations(scene: Phaser.Scene): void {
  const animations = [
    { key: "player-idle-down", frames: [0], row: 0, frameRate: 1, repeat: -1 },
    { key: "player-idle-left", frames: [0], row: 1, frameRate: 1, repeat: -1 },
    { key: "player-idle-right", frames: [0], row: 2, frameRate: 1, repeat: -1 },
    { key: "player-idle-up", frames: [0], row: 3, frameRate: 1, repeat: -1 },
    { key: "player-walk-down", frames: [0, 1, 2, 3], row: 0, frameRate: 8, repeat: -1 },
    { key: "player-walk-left", frames: [0, 1, 2, 3], row: 1, frameRate: 8, repeat: -1 },
    { key: "player-walk-right", frames: [0, 1, 2, 3], row: 2, frameRate: 8, repeat: -1 },
    { key: "player-walk-up", frames: [0, 1, 2, 3], row: 3, frameRate: 8, repeat: -1 },
    { key: "player-run-down", frames: [4, 5, 6, 7], row: 0, frameRate: 12, repeat: -1 },
    { key: "player-run-left", frames: [4, 5, 6, 7], row: 1, frameRate: 12, repeat: -1 },
    { key: "player-run-right", frames: [4, 5, 6, 7], row: 2, frameRate: 12, repeat: -1 },
    { key: "player-run-up", frames: [4, 5, 6, 7], row: 3, frameRate: 12, repeat: -1 },
    { key: "player-jump-down", frames: [8, 9, 10, 11], row: 0, frameRate: 10, repeat: 0 },
    { key: "player-jump-left", frames: [8, 9, 10, 11], row: 1, frameRate: 10, repeat: 0 },
    { key: "player-jump-right", frames: [8, 9, 10, 11], row: 2, frameRate: 10, repeat: 0 },
    { key: "player-jump-up", frames: [8, 9, 10, 11], row: 3, frameRate: 10, repeat: 0 },
    { key: "player-interact-down", frames: [12, 13, 14, 15], row: 0, frameRate: 12, repeat: 0 },
    { key: "player-interact-left", frames: [12, 13, 14, 15], row: 1, frameRate: 12, repeat: 0 },
    { key: "player-interact-right", frames: [12, 13, 14, 15], row: 2, frameRate: 12, repeat: 0 },
    { key: "player-interact-up", frames: [12, 13, 14, 15], row: 3, frameRate: 12, repeat: 0 },
  ] as const;

  for (const animation of animations) {
    if (scene.anims.exists(animation.key)) {
      continue;
    }

    scene.anims.create({
      key: animation.key,
      frames: animation.frames.map((frame) => ({
        key: "player-sheet",
        frame: animation.row * 16 + frame,
      })),
      frameRate: animation.frameRate,
      repeat: animation.repeat,
    });
  }

  const npcKeys = ["student", "staff", "archivist", "admin", "performer"] as const;
  for (const npcKey of npcKeys) {
    const animationKey = `npc-${npcKey}-idle`;
    if (scene.anims.exists(animationKey)) {
      continue;
    }
    scene.anims.create({
      key: animationKey,
      frames: scene.anims.generateFrameNumbers(`npc-${npcKey}`, { start: 0, end: 1 }),
      frameRate: 2,
      repeat: -1,
      yoyo: true,
    });
  }
}
