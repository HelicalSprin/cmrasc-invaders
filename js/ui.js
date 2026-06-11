import { CONTROL_CONFIG, MAX_LIVES, SYMBOLS, formatTime } from "./utils.js";

export class UIManager {
  constructor(documentRef = document) {
    this.document = documentRef;
    this.elements = {
      ui          : this.byId("ui"),
      screens     : Array.from(this.document.querySelectorAll(".screen")),
      hud         : this.byId("hud"),
      timer       : this.byId("h-timer"),
      wave        : this.byId("h-wave"),
      livesRow    : this.byId("lives-row"),
      buffbar     : this.byId("buffbar"),
      reloadbar   : this.byId("reloadbar"),
      reloadFill  : this.byId("reload-fill"),
      controls    : this.byId("ctrl"),
      waveFlash   : this.byId("wflash"),
      winTime     : this.byId("win-time"),
      gameOverTime: this.byId("go-time"),
      gameOverWave: this.byId("go-wave"),
      joyZone     : this.byId("joy-zone"),
      joyBase     : this.byId("joy-base"),
      joyKnob     : this.byId("joy-knob"),
      fireButton  : this.byId("fire-btn"),
      exitBtn     : this.byId("exit-btn"),
      quitModal   : this.byId("quit-modal"),
      quitCancel  : this.byId("quit-cancel"),
      quitConfirm : this.byId("quit-confirm"),
    };

    // ── JS State-machine slideshow ─────────────────────────────────────────
    // currentPanelIndex: which image (0-based) is visible right now.
    // total: number of .story-img elements (derived at init time).
    // autoTimer: handle for the 5-second auto-advance setTimeout.
    // Using a plain JS state object — NO scroll-snap, NO scrollTo.
    // Only one panel is visible at a time via .slide-active toggling.
    // ──────────────────────────────────────────────────────────────────────
    this._slide = { index: 0, total: 8, autoTimer: null };
  }

  byId(id) { return this.document.getElementById(id); }

  bindNavigation({ onNavigate, onStart, onQuit }) {
    this.document.querySelectorAll("[data-screen]").forEach((btn) => {
      btn.addEventListener("click", () => onNavigate(btn.dataset.screen));
    });

    this.document.querySelectorAll("[data-player]").forEach((btn) => {
      btn.addEventListener("click", () => onStart(btn.dataset.player));
    });

    // Story slideshow next button
    const nextBtn = this.byId("story-next-btn");
    if (nextBtn) nextBtn.addEventListener("click", () => this._slideAdvance());

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

  // ── Slideshow: JS state machine ─────────────────────────────────────────

  _slideInit() {
    const s    = this._slide;
    // Count actual images in the DOM each time (defensive)
    const imgs = this.document.querySelectorAll(".story-img");
    s.total    = imgs.length;
    s.index    = 0;

    // Build dots
    const dotsEl = this.byId("story-dots");
    if (dotsEl) {
      dotsEl.innerHTML = "";
      for (let i = 0; i < s.total; i++) {
        const d = this.document.createElement("span");
        d.className = "story-dot" + (i === 0 ? " active" : "");
        dotsEl.appendChild(d);
      }
    }

    this._slideGo(0);
  }

  _slideGo(index) {
    // Stop any pending auto-advance
    clearTimeout(this._slide.autoTimer);
    this._slide.index = index;

    const s      = this._slide;
    const imgs   = this.document.querySelectorAll(".story-img");
    const dotsEl = this.byId("story-dots");
    const fill   = this.byId("story-fill");
    const nextBtn = this.byId("story-next-btn");

    // Show only the target panel; hide all others
    imgs.forEach((img, i) => {
      img.classList.toggle("slide-active", i === index);
    });

    // Update dots
    if (dotsEl) {
      Array.from(dotsEl.children).forEach((d, i) => {
        d.classList.toggle("active", i === index);
      });
    }

    // Update button label
    if (nextBtn) {
      nextBtn.textContent = index === s.total - 1
        ? "CHOOSE YOUR FIGHTER →"
        : `NEXT  ${index + 1} / ${s.total}`;
    }

    // Animate progress bar from 0 → 100% over 5 seconds
    if (fill) {
      fill.style.transition = "none";
      fill.style.width      = "0%";
      // Force reflow so the reset actually takes effect before animating
      void fill.offsetWidth;
      fill.style.transition = "width 5s linear";
      fill.style.width      = "100%";
    }

    // Auto-advance after 5 seconds
    s.autoTimer = setTimeout(() => this._slideAdvance(), 5000);
  }

  _slideAdvance() {
    clearTimeout(this._slide.autoTimer);
    const next = this._slide.index + 1;
    if (next >= this._slide.total) {
      this.showScreen("scr-pick");
    } else {
      this._slideGo(next);
    }
  }

  // ── Touch / keyboard controls ─────────────────────────────────────────────

  bindControls({ setHorizontal, setFiring, isRunning }) {
    let joyId     = null;
    let joyOrigin = { x: 0, y: 0 };
    let fireId    = null;

    const joyStart = (clientX, clientY) => {
      const rect = this.elements.joyBase.getBoundingClientRect();
      joyOrigin  = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      joyMove(clientX);
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

    this.elements.joyZone.addEventListener("touchstart", (e) => {
      e.preventDefault();
      const t = e.changedTouches[0];
      joyId   = t.identifier;
      joyStart(t.clientX, t.clientY);
    }, { passive: false });

    this.elements.joyZone.addEventListener("touchmove", (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyMove(t.clientX); break; }
      }
    }, { passive: false });

    const endJoy = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === joyId) { joyEnd(); break; }
      }
    };

    this.elements.joyZone.addEventListener("touchend",    endJoy, { passive: false });
    this.elements.joyZone.addEventListener("touchcancel", endJoy, { passive: false });

    this.elements.fireButton.addEventListener("touchstart", (e) => {
      e.preventDefault();
      if (fireId === null) {
        const t = e.changedTouches[0];
        fireId  = t.identifier;
        if (isRunning()) setFiring(true);
        this.elements.fireButton.classList.add("pressed");
      }
    }, { passive: false });

    const endFire = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (t.identifier === fireId) {
          fireId = null;
          setFiring(false);
          this.elements.fireButton.classList.remove("pressed");
          break;
        }
      }
    };

    this.elements.fireButton.addEventListener("touchend",    endFire, { passive: false });
    this.elements.fireButton.addEventListener("touchcancel", endFire, { passive: false });

    this.document.addEventListener("keydown", (e) => {
      if (!isRunning()) return;
      if (e.key === "ArrowLeft"  || e.key === "a") setHorizontal(-1);
      if (e.key === "ArrowRight" || e.key === "d") setHorizontal(1);
      if (e.key === " " || e.key === "ArrowUp") { e.preventDefault(); setFiring(true); }
    });

    this.document.addEventListener("keyup", (e) => {
      if (e.key === "ArrowLeft"  || e.key === "a") setHorizontal(0);
      if (e.key === "ArrowRight" || e.key === "d") setHorizontal(0);
      if (e.key === " " || e.key === "ArrowUp")    setFiring(false);
    });
  }

  // ── Screen management ─────────────────────────────────────────────────────

  showScreen(id) {
    this.elements.screens.forEach((s) => s.classList.remove("active"));
    this.byId(id).classList.add("active");
    this.elements.ui.style.display = "flex";
    this.hideGameChrome();

    if (id === "scr-intro") {
      // Use rAF to ensure DOM is painted before computing image layout
      requestAnimationFrame(() => requestAnimationFrame(() => this._slideInit()));
    }
  }

  showGame() {
    this.elements.ui.style.display     = "none";
    this.elements.hud.style.display    = "flex";
    this.elements.buffbar.style.display = "flex";
    this.elements.reloadbar.style.display = "block";
    this.elements.controls.style.display  = "block";
  }

  hideGameChrome() {
    this.elements.hud.style.display       = "none";
    this.elements.buffbar.style.display   = "none";
    this.elements.reloadbar.style.display = "none";
    this.elements.controls.style.display  = "none";
  }

  resetControls() {
    this.elements.joyKnob.style.transform = "translate(-50%, -50%)";
    this.elements.fireButton.classList.remove("pressed");
  }

  // ── HUD updates ───────────────────────────────────────────────────────────

  updateTimer(ms) {
    this.elements.timer.textContent = formatTime(ms);
  }

  updateHud(game) {
    const { state } = game;
    this.elements.timer.textContent = formatTime(state.elapsed);
    this.elements.wave.textContent  = state.wave;
    this.elements.livesRow.innerHTML = "";

    for (let i = 0; i < Math.max(state.lives, MAX_LIVES); i += 1) {
      const span = this.document.createElement("span");
      span.textContent = i < state.lives ? SYMBOLS.heart : SYMBOLS.skull;
      this.elements.livesRow.appendChild(span);
    }
  }

  updateReloadBar(percent) {
    this.elements.reloadFill.style.width = `${percent}%`;
  }

  updateBuffBar(powerUps) {
    this.elements.buffbar.innerHTML = "";

    if (powerUps.bulletCount > 1) {
      const pill = this.document.createElement("div");
      pill.className   = "buff-pill";
      pill.textContent = `${SYMBOLS.fire} x${powerUps.bulletCount}`;
      this.elements.buffbar.appendChild(pill);
    }

    if (powerUps.reloadBonus > 0) {
      const pill = this.document.createElement("div");
      pill.className   = "buff-pill";
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
    this.elements.waveFlash.textContent  = text;
    this.elements.waveFlash.style.whiteSpace = "pre";
    this.elements.waveFlash.classList.add("show");
    window.setTimeout(() => this.elements.waveFlash.classList.remove("show"), 1400);
  }
}
