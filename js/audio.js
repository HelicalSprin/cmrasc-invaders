/**
 * AudioManager
 *
 * Handles two looping music tracks (menu / gameplay) and five SFX.
 * Web Audio requires a user-gesture to unlock the AudioContext on mobile.
 * We defer all playback until the first interaction then drain a queue.
 */
export class AudioManager {
  constructor() {
    this._ctx = null;
    this._unlocked = false;
    this._queue = [];          // callbacks waiting for unlock
    this._buffers = {};        // decoded AudioBuffer cache
    this._musicNode = null;    // currently playing music BufferSourceNode
    this._musicGain = null;    // gain node for music
    this._sfxGain = null;      // gain node for sfx
    this._shootCooldown = 0;   // frame counter to rate-limit shoot sfx

    // SFX shoot fires every frame while held — throttle to avoid distortion
    this._SHOOT_THROTTLE_MS = 160;
    this._lastShootTime = 0;

    this._FILES = {
      menuMusic:  "assets/audio/menu-loop.mp3",
      gameMusic:  "assets/audio/music-loop.mp3",
      shoot:      "assets/audio/sfx-shoot.wav",
      hit:        "assets/audio/sfx-hit.wav",
      pickup:     "assets/audio/sfx-pickup.wav",
      gameover:   "assets/audio/sfx-gameover.wav",
      win:        "assets/audio/sfx-win.wav",
    };

    this._preload();
  }

  // ── Internal: initialise AudioContext (safe to call multiple times) ──
  _initCtx() {
    if (this._ctx) return;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._musicGain = this._ctx.createGain();
      this._musicGain.gain.value = 0.45;
      this._musicGain.connect(this._ctx.destination);

      this._sfxGain = this._ctx.createGain();
      this._sfxGain.gain.value = 0.7;
      this._sfxGain.connect(this._ctx.destination);
    } catch (e) {
      console.warn("AudioContext unavailable:", e);
    }
  }

  // ── Preload: fetch & decode all files in the background ──
  _preload() {
    // Use a temporary context just for decoding (avoids the gesture requirement
    // for fetch/decode on most browsers). We swap to the real ctx on unlock.
    Object.entries(this._FILES).forEach(([key, url]) => {
      fetch(url)
        .then(r => r.arrayBuffer())
        .then(buf => {
          // Decode lazily on first real ctx creation
          this._rawBuffers = this._rawBuffers || {};
          this._rawBuffers[key] = buf;
        })
        .catch(() => {}); // audio failure is non-fatal
    });
  }

  // ── Decode raw ArrayBuffers once the AudioContext exists ──
  async _decodeAll() {
    if (!this._ctx || !this._rawBuffers) return;
    const pending = Object.entries(this._rawBuffers).filter(([k]) => !this._buffers[k]);
    await Promise.all(pending.map(async ([key, raw]) => {
      try {
        this._buffers[key] = await this._ctx.decodeAudioData(raw.slice(0));
      } catch (e) {}
    }));
  }

  // ── Must be called on first user gesture (tap / keydown) ──
  async unlock() {
    if (this._unlocked) return;
    this._initCtx();
    if (!this._ctx) return;

    try {
      await this._ctx.resume();
    } catch (e) {}

    await this._decodeAll();
    this._unlocked = true;

    // Drain queued calls
    this._queue.forEach(fn => fn());
    this._queue = [];
  }

  _whenReady(fn) {
    if (this._unlocked) fn();
    else this._queue.push(fn);
  }

  // ── Play a one-shot SFX ──
  _playSfx(key, { playbackRate = 1 } = {}) {
    this._whenReady(() => {
      const buf = this._buffers[key];
      if (!buf || !this._ctx) return;
      const src = this._ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = playbackRate;
      src.connect(this._sfxGain);
      src.start();
    });
  }

  // ── Start a looping music track (stops the previous one first) ──
  _startMusic(key) {
    this._whenReady(() => {
      this._stopMusicNow();
      const buf = this._buffers[key];
      if (!buf || !this._ctx) return;
      const src = this._ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(this._musicGain);
      src.start();
      this._musicNode = src;
    });
  }

  _stopMusicNow() {
    if (this._musicNode) {
      try { this._musicNode.stop(); } catch (e) {}
      this._musicNode = null;
    }
  }

  // ── Public API ──

  startMenuMusic() {
    this._startMusic("menuMusic");
  }

  startGameMusic() {
    this._startMusic("gameMusic");
  }

  stopMusic() {
    this._stopMusicNow();
  }

  /** Call every game frame while firing — internally throttled */
  playShot() {
    const now = performance.now();
    if (now - this._lastShootTime < this._SHOOT_THROTTLE_MS) return;
    this._lastShootTime = now;
    this._playSfx("shoot", { playbackRate: 0.95 + Math.random() * 0.1 });
  }

  playHit() {
    this._playSfx("hit");
  }

  playPickup() {
    this._playSfx("pickup");
  }

  playUpgrade() {
    // Reuse pickup sfx with a higher pitch for the upgrade moment
    this._playSfx("pickup", { playbackRate: 1.4 });
  }

  playGameOver() {
    this._playSfx("gameover");
  }

  playWin() {
    this._playSfx("win");
  }
}
