export class AudioManager {
  constructor() {
    this._ctx        = null;
    this._buffers    = {};       // key → decoded AudioBuffer
    this._musicNode  = null;
    this._musicGain  = null;
    this._sfxGain    = null;
    this._ready      = false;    // true once ctx exists + all buffers decoded
    this._queue      = [];       // fns waiting for ready

    this._lastShootTime = 0;
    this._SHOOT_THROTTLE_MS = 150;

    this._FILES = {
      menuMusic : "assets/audio/menu-loop.mp3",
      gameMusic : "assets/audio/music-loop.mp3",
      shoot     : "assets/audio/sfx-shoot.wav",
      hit       : "assets/audio/sfx-hit.wav",
      pickup    : "assets/audio/sfx-pickup.wav",
      gameover  : "assets/audio/sfx-gameover.wav",
      win       : "assets/audio/sfx-win.wav",
    };
  }

  // Called once on first user gesture from main.js
  async unlock() {
    if (this._ready) return;

    // 1. Create context
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio not supported:", e);
      return;
    }

    // 2. Resume (needed on iOS)
    try { await this._ctx.resume(); } catch (_) {}

    // 3. Gain nodes
    this._musicGain = this._ctx.createGain();
    this._musicGain.gain.value = 0.45;
    this._musicGain.connect(this._ctx.destination);

    this._sfxGain = this._ctx.createGain();
    this._sfxGain.gain.value = 0.8;
    this._sfxGain.connect(this._ctx.destination);

    // 4. Fetch + decode everything in parallel
    await Promise.all(
      Object.entries(this._FILES).map(async ([key, url]) => {
        try {
          const res = await fetch(url);
          const raw = await res.arrayBuffer();
          this._buffers[key] = await this._ctx.decodeAudioData(raw);
        } catch (e) {
          console.warn(`Audio load failed [${key}]:`, e);
        }
      })
    );

    // 5. Mark ready and flush queue
    this._ready = true;
    this._queue.forEach(fn => fn());
    this._queue = [];
  }

  _whenReady(fn) {
    if (this._ready) fn();
    else this._queue.push(fn);
  }

  _playSfx(key, rate = 1) {
    this._whenReady(() => {
      const buf = this._buffers[key];
      if (!buf) return;
      const src = this._ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      src.connect(this._sfxGain);
      src.start(0);
    });
  }

  _startMusic(key) {
    this._whenReady(() => {
      this._stopMusicNode();
      const buf = this._buffers[key];
      if (!buf) return;
      const src = this._ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(this._musicGain);
      src.start(0);
      this._musicNode = src;
    });
  }

  _stopMusicNode() {
    if (this._musicNode) {
      try { this._musicNode.stop(); } catch (_) {}
      this._musicNode = null;
    }
  }

  // ── Public API ──

  startMenuMusic()  { this._startMusic("menuMusic"); }
  startGameMusic()  { this._startMusic("gameMusic"); }
  stopMusic()       { this._stopMusicNode(); }

  playShot() {
    const now = performance.now();
    if (now - this._lastShootTime < this._SHOOT_THROTTLE_MS) return;
    this._lastShootTime = now;
    this._playSfx("shoot", 0.95 + Math.random() * 0.1);
  }

  playHit()      { this._playSfx("hit"); }
  playPickup()   { this._playSfx("pickup"); }
  playUpgrade()  { this._playSfx("pickup", 1.5); }
  playGameOver() { this._playSfx("gameover"); }
  playWin()      { this._playSfx("win"); }
}
