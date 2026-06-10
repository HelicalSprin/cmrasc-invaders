import { AudioManager } from "./audio.js";
import { Game } from "./game.js";
import { UIManager } from "./ui.js";

const canvas = document.getElementById("c");
const ui = new UIManager(document);
const audio = new AudioManager();
const game = new Game({ canvas, ui, audio });

ui.bindNavigation({
  onNavigate: (screenId) => {
    game.stop();
    ui.showScreen(screenId);
  },
  onStart: (profileKey) => {
    game.start(profileKey);
  },
  onQuit: () => {
    game.end(false);
  },
});

ui.bindControls({
  setHorizontal: (value) => game.setHorizontal(value),
  setFiring: (value) => game.setFiring(value),
  isRunning: () => game.isRunning(),
});
