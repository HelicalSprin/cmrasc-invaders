export class AudioManager {
  constructor() {
    this._music = null;
    this._muted = false;
    this._lastShootTime = 0;
    this._SHOOT_THROTTLE_MS = 150;

    this._sfx = {
      shoot   : "assets/audio/sfx-shoot.wav",
      hit     : "assets/audio/sfx-hit.wav",
      pickup  : "assets/audio/sfx-pickup.wav",
      gameover: "assets/audio/sfx-gameover.wav",
      win     : "assets/audio/sfx-win.wav",
    };
  }

  // Call this synchronously inside a click/touch handler — no async gap
  startMenuMusic() { this._startMusic("assets/audio/menu-loop.mp3"); }
  startGameMusic() { this._startMusic("assets/audio/music-loop.mp3"); }

  _startMusic(src) {
    this.stopMusic();
    if (this._muted) return;
    const a = new Audio(src);
    a.loop   = true;
    a.volume = 0.45;
    // play() returns a promise — catch silently, don't await
    a.play().catch(e => console.warn("Music blocked:", e));
    this._music = a;
  }

  stopMusic() {
    if (this._music) {
      this._music.pause();
      this._music = null;
    }
  }

  _playSfx(src, rate = 1) {
    if (this._muted) return;
    const a = new Audio(src);
    a.volume = 0.75;
    a.playbackRate = rate;
    a.play().catch(() => {});
  }

  toggleMute() {
    this._muted = !this._muted;
    if (this._muted) {
      this.stopMusic();
    }
    return this._muted;
  }

  async unlock() {} // no-op kept for compatibility

  playShot() {
    const now = performance.now();
    if (now - this._lastShootTime < this._SHOOT_THROTTLE_MS) return;
    this._lastShootTime = now;
    this._playSfx(this._sfx.shoot, 0.95 + Math.random() * 0.1);
  }

  playHit()      { this._playSfx(this._sfx.hit); }
  playPickup()   { this._playSfx(this._sfx.pickup); }
  playUpgrade()  { this._playSfx(this._sfx.pickup, 1.5); }
  playGameOver() { this._playSfx(this._sfx.gameover); }
  playWin()      { this._playSfx(this._sfx.win); }
}
