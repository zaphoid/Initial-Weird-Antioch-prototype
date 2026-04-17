import Phaser from "phaser";
import type { InputAction } from "./actions";

export type InputBindingMap = Record<InputAction, Phaser.Input.Keyboard.Key[]>;

export function createInputBindings(
  scene: Phaser.Scene,
): InputBindingMap {
  const keyboard = scene.input.keyboard;

  if (!keyboard) {
    throw new Error("Keyboard input is unavailable.");
  }

  return {
    "move-up": [keyboard.addKey("W"), keyboard.addKey("UP")],
    "move-down": [keyboard.addKey("S"), keyboard.addKey("DOWN")],
    "move-left": [keyboard.addKey("A"), keyboard.addKey("LEFT")],
    "move-right": [keyboard.addKey("D"), keyboard.addKey("RIGHT")],
    run: [keyboard.addKey("SHIFT")],
    jump: [keyboard.addKey("SPACE")],
    "search-pulse": [keyboard.addKey("F")],
    interact: [keyboard.addKey("E"), keyboard.addKey("ENTER")],
    "toggle-quest-board": [keyboard.addKey("Q"), keyboard.addKey("TAB")],
    "toggle-debug": [keyboard.addKey("F1"), keyboard.addKey("BACKTICK")],
  };
}

export function isActionDown(
  bindings: InputBindingMap,
  action: InputAction,
): boolean {
  return bindings[action].some((key) => key.isDown);
}

export function wasActionPressed(
  bindings: InputBindingMap,
  action: InputAction,
): boolean {
  return bindings[action].some(Phaser.Input.Keyboard.JustDown);
}
