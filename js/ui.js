import { CONTROL_CONFIG, MAX_LIVES, SYMBOLS, formatTime } from "./utils.js";

export class UIManager {
  constructor(documentRef = document) {
    this.document = documentRef;
    this.elements = {
      ui: this.byId("ui"),
      screens: Array.from(this.document.querySelectorAll(".screen")),
      hud: this.byId("hud"),
      timer: this.byId("h-timer"),
      wave: this.byId("h-wave"),
      livesRow: this.byId("lives-row"),
      buffbar: this.byId("buffbar"),
      reloadbar: this.byId("reloadbar"),
      reloadFill: this.byId("reload-fill"),
      controls: this.byId("ctrl"),
      waveFlash: this.byId("wflash"),
      winTime: this.byId("win-time"),
      gameOverTime: this.byId("go-time"),
      gameOverWave: this.byId("go-wave"),
      joyZone: this.byId("joy-zone"),
      joyBase: this.byId("joy-base"),
      joyKnob: this.byId("joy-knob"),
      fireButton: this.byId("fire-btn"),
      exitBtn: this.byId("exit-btn"),
      quitModal: this.byId("quit-modal"),
      quitCancel: this.byId("quit-cancel"),
      quitConfirm: this.byId("quit-confirm"),
    };
    this._slide = { index: 0, total: 8, timer: null };
  }

  byId(id) {
    return this.document.getElementById(id);
  }

  bindNavigation({ onNavigate, onStart, onQuit }) {
    this.document.querySelectorAll("[data-screen]").forEach((button) => {
      button.addEventListener("click", () => {
        onNavigate(button.dataset.screen);
      });
    });

    this.document.querySelectorAll("[data-player]").forEach((button) => {
      button.addEventListener("click", () => onStart(button.dataset.player));
    });

    // Slideshow next button
    const nextBtn = this.byId("story-next-btn");
    if (nextBtn) {
      nextBtn.addEventListener("click", () => this._slideAdvance());
    }

    // Exit / quit modal
    if (this.elements.exitBtn) {
      this.elements.exitBtn.addEventListener("click", () => {
        this.elements.quitModal.style.display = "flex";
      });
    }
    if (this.elements.quitCancel) {
      this.elements.quitCancel.addEventListener("click", () => {
        this.elements.quitModal.style.display = "none";
      });
    }
    if (this.elements.quitConfirm) {
      this.elements.quitConfirm.addEventListener("click", () => {
        this.elements.quitModal.style.display = "none";
        onQuit();
      });
    }
  }

  _slideInit() {
    const s = this._slide;
    s.index = 0;

    const dotsEl = this.byId("story-dots");
    if (dotsEl) {
      dotsEl.innerHTML = "";
      for (let i = 0; i < s.total; i++) {
        const d = this.document.createElement("span");
        d.className = "story-dot" + (i === 0 ? " active" : "");
        dotsEl.appendChild(d);
      }
    }

    // Reset scroll to start
    const vp = this.byId("story-viewport");
    if (vp) vp.scrollLeft = 0;

    this._slideGo(0);
  }

  _slideGo(index) {
    clearTimeout(this._slide.timer);
    this._slide.index = index;

    const vp = this.byId("story-viewport");
    const fill = this.byId("story-fill");
    const nextBtn = this.byId("story-next-btn");
    const dotsEl = this.byId("story-dots");

    // Scroll the snap container to the right panel
    if (vp) {
      const w = vp.offsetWidth;
      vp.scrollTo({ left: index * w, behavior: "smooth" });
    }

    // Dots
    if (dotsEl) {
      Array.from(dotsEl.children).forEach((d, i) => {
        d.classList.toggle("active", i === index);
      });
    }

    // Button label
    if (nextBtn) {
      nextBtn.textContent = index === this._slide.total - 1
        ? "CHOOSE YOUR FIGHTER →"
        : `NEXT  ${index + 1} / ${this._slide.total}`;
    }

    // Progress bar
    if (fill) {
      fill.style.transition = "none";
      fill.style.width = "0%";
      void fill.offsetWidth;
      fill.style.transition = "width 5s linear";
      fill.style.width = "100%";
    }

    this._slide.timer = setTimeout(() => this._slideAdvance(), 5000);
  }

  _slideAdvance() {
    clearTimeout(this._slide.timer);
    const next = this._slide.index + 1;
    if (next >= this._slide.total) {
      this.showScreen("scr-pick");
    } else {
      this._slideGo(next);
    }
  }

  bindControls({ setHorizontal, setFiring, isRunning }) {
    let joyId = null;
    let joyOrigin = { x: 0, y: 0 };
    let fireId = null;

    const joyStart = (clientX, clientY) => {
      const rect = this.elements.joyBase.getBoundingClientRect();
      joyOrigin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      joyMove(clientX, clientY);
    };

    const joyMove = (clientX) => {
      let dx = clientX - joyOrigin.x;
      dx = Math.max(-CONTROL_CONFIG.joystickRadius, Math.min(CONTROL_CONFIG.joystickRadius, dx));
      this.elements.joyKnob.style.transform = `translate(calc(-50% + ${dx}px), -50%)`;
      setHorizontal(dx / CONTROL_CONFIG.joystickRadius);
    };

    const joyEnd = () => {
      this.elements.joyKnob.style.transform = "translate(-50%, -50%)";
      if (isRunning()) setHorizontal(0);
      joyId = null;
    };

    this.elements.joyZone.addEventListener("touchstart", (event) => {
      event.preventDefault();
      const touch = event.changedTouches[0];
      joyId = touch.identifier;
      joyStart(touch.clientX, touch.clientY);
    }, { passive: false });

    this.elements.joyZone.addEventListener("touchmove", (event) => {
      event.preventDefault();
      for (const touch of event.changedTouches) {
        if (touch.identifier === joyId) {
          joyMove(touch.clientX);
          break;
        }
      }
    }, { passive: false });

    const endJoyTouch = (event) => {
      event.preventDefault();
      for (const touch of event.changedTouches) {
        if (touch.identifier === joyId) { joyEnd(); break; }
      }
    };

    this.elements.joyZone.addEventListener("touchend", endJoyTouch, { passive: false });
    this.elements.joyZone.addEventListener("touchcancel", endJoyTouch, { passive: false });

    this.elements.fireButton.addEventListener("touchstart", (event) => {
      event.preventDefault();
      if (fireId === null) {
        const touch = event.changedTouches[0];
        fireId = touch.identifier;
        if (isRunning()) setFiring(true);
        this.elements.fireButton.classList.add("pressed");
      }
    }, { passive: false });

    const endFireTouch = (event) => {
      event.preventDefault();
      for (const touch of event.changedTouches) {
        if (touch.identifier === fireId) {
          fireId = null;
          setFiring(false);
          this.elements.fireButton.classList.remove("pressed");
          break;
        }
      }
    };

    this.elements.fireButton.addEventListener("touchend", endFireTouch, { passive: false });
    this.elements.fireButton.addEventListener("touchcancel", endFireTouch, { passive: false });

    this.document.addEventListener("keydown", (event) => {
      if (!isRunning()) return;
      if (event.key === "ArrowLeft" || event.key === "a") setHorizontal(-1);
      if (event.key === "ArrowRight" || event.key === "d") setHorizontal(1);
      if (event.key === " " || event.key === "ArrowUp") { event.preventDefault(); setFiring(true); }
    });

    this.document.addEventListener("keyup", (event) => {
      if (event.key === "ArrowLeft" || event.key === "a") setHorizontal(0);
      if (event.key === "ArrowRight" || event.key === "d") setHorizontal(0);
      if (event.key === " " || event.key === "ArrowUp") setFiring(false);
    });
  }

  showScreen(id) {
    this.elements.screens.forEach((screen) => screen.classList.remove("active"));
    this.byId(id).classList.add("active");
    this.elements.ui.style.display = "flex";
    this.hideGameChrome();

    if (id === "scr-intro") {
      // Wait two frames so the screen is fully rendered and offsetWidth is correct
      requestAnimationFrame(() => requestAnimationFrame(() => this._slideInit()));
    }
  }

  showGame() {
    this.elements.ui.style.display = "none";
    this.elements.hud.style.display = "flex";
    this.elements.buffbar.style.display = "flex";
    this.elements.reloadbar.style.display = "block";
    this.elements.controls.style.display = "block";
  }

  hideGameChrome() {
    this.elements.hud.style.display = "none";
    this.elements.buffbar.style.display = "none";
    this.elements.reloadbar.style.display = "none";
    this.elements.controls.style.display = "none";
  }

  resetControls() {
    this.elements.joyKnob.style.transform = "translate(-50%, -50%)";
    this.elements.fireButton.classList.remove("pressed");
  }

  updateTimer(ms) {
    this.elements.timer.textContent = formatTime(ms);
  }

  updateHud(game) {
    const { state } = game;
    this.elements.timer.textContent = formatTime(state.elapsed);
    this.elements.wave.textContent = state.wave;
    this.elements.livesRow.innerHTML = "";

    for (let i = 0; i < Math.max(state.lives, MAX_LIVES); i += 1) {
      const life = this.document.createElement("span");
      life.textContent = i < state.lives ? SYMBOLS.heart : SYMBOLS.skull;
      this.elements.livesRow.appendChild(life);
    }
  }

  updateReloadBar(percent) {
    this.elements.reloadFill.style.width = `${percent}%`;
  }

  updateBuffBar(powerUps) {
    this.elements.buffbar.innerHTML = "";

    if (powerUps.bulletCount > 1) {
      const pill = this.document.createElement("div");
      pill.className = "buff-pill";
      pill.textContent = `${SYMBOLS.fire} x${powerUps.bulletCount}`;
      this.elements.buffbar.appendChild(pill);
    }

    if (powerUps.reloadBonus > 0) {
      const pill = this.document.createElement("div");
      pill.className = "buff-pill";
      pill.textContent = `${SYMBOLS.lightning} -${powerUps.reloadBonus}ms`;
      this.elements.buffbar.appendChild(pill);
    }
  }

  showResult(won, game) {
    const timeText = formatTime(game.state.elapsed);
    if (won) {
      this.elements.winTime.textContent = timeText;
      this.showScreen("scr-win");
      return;
    }
    this.elements.gameOverTime.textContent = timeText;
    this.elements.gameOverWave.textContent = game.state.wave;
    this.showScreen("scr-over");
  }

  showWaveFlash(text) {
    this.elements.waveFlash.textContent = text;
    this.elements.waveFlash.style.whiteSpace = "pre";
    this.elements.waveFlash.classList.add("show");
    window.setTimeout(() => this.elements.waveFlash.classList.remove("show"), 1400);
  }
}
