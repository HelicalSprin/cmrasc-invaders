import { AudioManager } from "./audio.js";
import { Game } from "./game.js";
import { UIManager } from "./ui.js";

const canvas = document.getElementById("c");
const ui     = new UIManager(document);
const audio  = new AudioManager();
const game   = new Game({ canvas, ui, audio });

// ── Unlock Web Audio on the very first user gesture ──
const unlockOnce = () => {
  audio.unlock().then(() => audio.startMenuMusic());
  window.removeEventListener("touchstart", unlockOnce, true);
  window.removeEventListener("mousedown",  unlockOnce, true);
  window.removeEventListener("keydown",    unlockOnce, true);
};
window.addEventListener("touchstart", unlockOnce, { capture: true, passive: true });
window.addEventListener("mousedown",  unlockOnce, { capture: true });
window.addEventListener("keydown",    unlockOnce, { capture: true });

ui.bindNavigation({
  onNavigate: (screenId) => {
    game.stop();
    ui.showScreen(screenId);
    // Return to menu music whenever we're back on a non-game screen
    audio.startMenuMusic();
  },
  onStart: (profileKey) => {
    audio.stopMusic();
    game.start(profileKey);
    audio.startGameMusic();
  },
  onQuit: () => {
    audio.stopMusic();
    game.end(false);
    audio.startMenuMusic();
  },
});

ui.bindControls({
  setHorizontal: (value) => game.setHorizontal(value),
  setFiring:     (value) => game.setFiring(value),
  isRunning:     ()      => game.isRunning(),
});
