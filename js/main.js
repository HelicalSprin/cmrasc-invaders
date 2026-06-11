import { AudioManager } from "./audio.js";
import { Game } from "./game.js";
import { UIManager } from "./ui.js";

// ─────────────────────────────────────────────────────────────────────────────
// VIRTUAL RESOLUTION LETTERBOX SYSTEM
// Logical canvas size: 390 × 844 px (matches .game-container CSS dimensions)
// On every resize we compute the largest uniform scale that fits the physical
// viewport, apply it to .game-container via CSS transform, and let the browser
// letterbox/pillarbox naturally (black body background shows in bars).
// ALL game coordinates stay in the 0–390 × 0–844 space — nothing changes.
// ─────────────────────────────────────────────────────────────────────────────
const LOGICAL_W = 390;
const LOGICAL_H = 844;

function applyLetterbox() {
  const shell = document.getElementById("game-container");
  const scaleX = window.innerWidth  / LOGICAL_W;
  const scaleY = window.innerHeight / LOGICAL_H;
  const scale  = Math.min(scaleX, scaleY);
  shell.style.transform = `scale(${scale})`;
}

applyLetterbox();
window.addEventListener("resize", applyLetterbox);

// ─────────────────────────────────────────────────────────────────────────────
// Game bootstrap
// ─────────────────────────────────────────────────────────────────────────────
const canvas = document.getElementById("c");
const ui     = new UIManager(document);
const audio  = new AudioManager();
const game   = new Game({ canvas, ui, audio });

ui.bindNavigation({
  onNavigate : (screenId) => { game.stop(); ui.showScreen(screenId); },
  onStart    : (profileKey) => { game.start(profileKey); },
  onQuit     : () => { game.end(false); },
});

ui.bindControls({
  setHorizontal : (value) => game.setHorizontal(value),
  setFiring     : (value) => game.setFiring(value),
  isRunning     : () => game.isRunning(),
});
