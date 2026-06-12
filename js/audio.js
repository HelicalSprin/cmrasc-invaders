export class AudioManager {
  constructor() {
    this._musicEl = null;
    this._lastShootTime = 0;
    this._SHOOT_THROTTLE_MS = 150;

    // Pre-create all Audio elements — works on file:// and http://
    this._sfx = {
      shoot   : this._el("assets/audio/sfx-shoot.wav"),
      hit     : this._el("assets/audio/sfx-hit.wav"),
      pickup  : this._el("assets/audio/sfx-pickup.wav"),
      gameover: this._el("assets/audio/sfx-gameover.wav"),
      win     : this._el("assets/audio/sfx-win.wav"),
    };
  }

  _el(src, loop = false, volume = 1) {
    const a = new Audio(src);
    a.loop = loop;
    a.volume = volume;
    a.preload = "auto";
    return a;
  }

  _play(el, rate = 1) {
    try {
      el.currentTime = 0;
      el.playbackRate = rate;
      el.play().catch(() => {});
    } catch (_) {}
  }

  // ── Music: create a fresh Audio node each time to avoid state issues ──
  _startMusic(src) {
    this.stopMusic();
    this._musicEl = this._el(src, true, 0.45);
    this._musicEl.play().catch(() => {});
  }

  stopMusic() {
    if (this._musicEl) {
      this._musicEl.pause();
      this._musicEl.src = "";
      this._musicEl = null;
    }
  }

  startMenuMusic() { this._startMusic("assets/audio/menu-loop.mp3"); }
  startGameMusic() { this._startMusic("assets/audio/music-loop.mp3"); }

  // ── SFX ──
  playShot() {
    const now = performance.now();
    if (now - this._lastShootTime < this._SHOOT_THROTTLE_MS) return;
    this._lastShootTime = now;
    this._play(this._sfx.shoot, 0.95 + Math.random() * 0.1);
  }

  playHit()      { this._play(this._sfx.hit); }
  playPickup()   { this._play(this._sfx.pickup); }
  playUpgrade()  { this._play(this._sfx.pickup, 1.5); }
  playGameOver() { this._play(this._sfx.gameover); }
  playWin()      { this._play(this._sfx.win); }

  // No-op — unlock no longer needed with HTMLAudioElement
  async unlock() {}
}
