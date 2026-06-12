import { AudioManager } from "./audio.js";
import { Game } from "./game.js";
import { UIManager } from "./ui.js";

const canvas = document.getElementById("c");
const ui    = new UIManager(document);
const audio = new AudioManager();
const game  = new Game({ canvas, ui, audio });

// ── Start menu music on the very first tap/click — synchronously, no await ──
let audioStarted = false;
const startAudioOnce = () => {
  if (audioStarted) return;
  audioStarted = true;
  audio.startMenuMusic();
};
document.addEventListener("touchstart", startAudioOnce, { once: true, passive: true });
document.addEventListener("mousedown",  startAudioOnce, { once: true });
document.addEventListener("keydown",    startAudioOnce, { once: true });

// ── Mute button ──
const muteBtn = document.getElementById("mute-btn");
if (muteBtn) {
  muteBtn.addEventListener("click", () => {
    const muted = audio.toggleMute();
    muteBtn.textContent = muted ? "🔇" : "🔊";
  });
}

ui.bindNavigation({
  onNavigate: (screenId) => {
    game.stop();
    ui.showScreen(screenId);
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
  setHorizontal: (v) => game.setHorizontal(v),
  setFiring:     (v) => game.setFiring(v),
  isRunning:     ()  => game.isRunning(),
});
