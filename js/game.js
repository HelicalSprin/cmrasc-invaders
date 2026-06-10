import { BulletManager } from "./bullet.js";
import { CollisionSystem } from "./collision.js";
import { EnemyManager } from "./enemy.js";
import { Player } from "./player.js";
import {
  COLORS,
  MAX_LIVES,
  SYMBOLS,
  WAVE_DEFINITIONS,
  createParticleBurst,
  createStars,
  drawEmoji,
} from "./utils.js";

export class Game {
  constructor({ canvas, ui, audio }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ui = ui;
    this.audio = audio;

    this.state = this.createBaseState();
    this.powerUps = this.createPowerUps();
    this.input = { horizontal: 0, firing: false };
    this.player = null;
    this.pendingTimers = new Set();

    this.bulletManager = new BulletManager();
    this.enemyManager = new EnemyManager(this);
    this.collisionSystem = new CollisionSystem(this);

    this.loop = this.loop.bind(this);
    this.resize = this.resize.bind(this);
    this.resize();
    window.addEventListener("resize", this.resize);
  }

  createBaseState() {
    return {
      running: false,
      wave: 1,
      score: 0,
      lives: MAX_LIVES,
      startTime: 0,
      elapsed: 0,
      waveCleared: false,
      raf: null,
      lastTime: 0,
      stars: createStars(),
      particles: [],
    };
  }

  createPowerUps() {
    return {
      bulletCount: 1,
      reloadBase: 120,
      reloadBonus: 0,
      reloadTimer: 0,
    };
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start(profileKey) {
    this.stop();
    this.state = this.createBaseState();
    this.powerUps = this.createPowerUps();
    this.input = { horizontal: 0, firing: false };
    this.player = new Player(profileKey, this.canvas);
    this.bulletManager.reset();
    this.enemyManager.resetAll();

    this.ui.showGame();
    this.ui.updateBuffBar(this.powerUps);
    this.syncHud();
    this.enemyManager.launchWave(this.state.wave);

    this.state.running = true;
    this.state.startTime = performance.now();
    this.state.lastTime = this.state.startTime;
    this.state.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    if (this.state.raf) {
      cancelAnimationFrame(this.state.raf);
    }
    this.clearTimers();
    this.state.running = false;
    this.input.firing = false;
    this.input.horizontal = 0;
    this.ui.resetControls();
  }

  isRunning() {
    return this.state.running;
  }

  setHorizontal(value) {
    this.input.horizontal = value;
  }

  setFiring(value) {
    this.input.firing = value;
  }

  loop(timestamp) {
    if (!this.state.running) {
      return;
    }

    this.state.lastTime = timestamp;
    if (this.state.startTime > 0) {
      this.state.elapsed = timestamp - this.state.startTime;
      this.ui.updateTimer(this.state.elapsed);
    }

    this.bulletManager.preUpdateEnemyBullets();
    this.update();
    this.draw();
    this.state.raf = requestAnimationFrame(this.loop);
  }

  update() {
    if (!this.player) {
      return;
    }

    this.player.updateMovement(this.input.horizontal, this.state.wave, this.canvas);
    this.state.elapsed = performance.now() - this.state.startTime;
    this.player.tickShield();
    this.bulletManager.tickReload(this.powerUps);

    if (this.input.firing) {
      this.player.shoot(this.bulletManager, this.powerUps);
    }

    this.ui.updateReloadBar(this.bulletManager.getReloadPercent(this.powerUps));
    this.bulletManager.updatePlayerBullets();
    this.bulletManager.updateEnemyBullets(this.canvas);
    this.enemyManager.updateDrops(this.canvas);
    this.updateParticles();
    this.enemyManager.update();
    this.collisionSystem.update();
  }

  updateParticles() {
    this.state.particles = this.state.particles.filter((particle) => particle.life > 0);
    this.state.particles.forEach((particle) => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.91;
      particle.vy *= 0.91;
      particle.life -= 1;
    });
  }

  draw() {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawStars();
    this.drawParticles();
    this.enemyManager.render(this.ctx);
    this.bulletManager.render(this.ctx, this.player.color);
    this.player.render(this.ctx);
    this.drawTopIndicator();
  }

  drawStars() {
    this.ctx.fillStyle = COLORS.whiteStar;
    this.state.stars.forEach((star) => {
      star.y += star.spd;
      if (star.y > this.canvas.height) {
        star.y = 0;
      }
      this.ctx.beginPath();
      this.ctx.arc(star.x % this.canvas.width, star.y, star.r, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawParticles() {
    this.state.particles.forEach((particle) => {
      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  drawTopIndicator() {
    drawEmoji(this.ctx, SYMBOLS.crown, this.canvas.width / 2, 30, 18);
    this.ctx.save();
    this.ctx.font = "700 9px Space Mono, monospace";
    this.ctx.fillStyle = "rgba(255,214,0,0.45)";
    this.ctx.textAlign = "center";
    this.ctx.fillText("FREE THE CULT MOTHER", this.canvas.width / 2, 46);
    this.ctx.restore();
  }

  addBurst(x, y, color, count) {
    createParticleBurst(this.state.particles, x, y, color, count);
  }

  damagePlayer(color, particleCount) {
    this.player.activateShield();
    this.state.lives -= 1;
    this.addBurst(this.player.x, this.player.y, color, particleCount);
    this.syncHud();

    if (this.state.lives <= 0) {
      this.end(false);
    }
  }

  applyGift(type) {
    if (type === "speed") {
      this.powerUps.reloadBonus = Math.min(this.powerUps.reloadBonus + 20, this.powerUps.reloadBase - 6);
    } else if (type === "multi") {
      this.powerUps.bulletCount = Math.min(this.powerUps.bulletCount + 1, 5);
    }

    this.ui.updateBuffBar(this.powerUps);
  }

  waveOver() {
    if (this.state.waveCleared) {
      return;
    }

    this.state.waveCleared = true;
    this.bulletManager.clearEnemy();
    this.enemyManager.clearDrops();

    if (this.state.wave >= WAVE_DEFINITIONS.length) {
      this.end(true);
      return;
    }

    this.state.wave += 1;
    this.syncHud();
    this.schedule(() => this.enemyManager.launchWave(this.state.wave), 1200);
  }

  flashWave() {
    const definition = WAVE_DEFINITIONS[this.state.wave - 1];
    let label = `WAVE ${this.state.wave}`;
    if (definition.type === "miniboss") {
      label = `WAVE ${this.state.wave}\nMINI BOSS!`;
    }
    if (definition.type === "boss") {
      label = `WAVE ${this.state.wave}\nEVIL RENJITHA!`;
    }
    this.ui.showWaveFlash(label);
  }

  schedule(callback, delay) {
    const timerId = window.setTimeout(() => {
      this.pendingTimers.delete(timerId);
      if (this.state.running) {
        callback();
      }
    }, delay);
    this.pendingTimers.add(timerId);
    return timerId;
  }

  clearTimers() {
    this.pendingTimers.forEach((timerId) => window.clearTimeout(timerId));
    this.pendingTimers.clear();
  }

  syncHud() {
    if (this.player) {
      this.ui.updateHud(this);
    }
  }

  end(won) {
    this.state.running = false;
    if (this.state.raf) {
      cancelAnimationFrame(this.state.raf);
    }
    this.clearTimers();
    this.input.firing = false;
    this.audio.stopMusic();
    this.ui.showResult(won, this);
  }
}
