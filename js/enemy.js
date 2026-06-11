import {
  COLORS,
  LOGICAL_W,
  LOGICAL_H,
  SYMBOLS,
  WAVE_DEFINITIONS,
  drawEmoji,
  drawHpBar,
  drawLabel,
} from "./utils.js";

const MINION = Object.freeze({
  columns        : 7,
  width          : 34,
  height         : 34,
  startY         : 80,
  spacingY       : 50,
  edgePaddingRatio: 0.06,
});

// ─── DIFFICULTY / PACING CONSTANTS ───────────────────────────────────────────
//
// DROP_BASE  — how many px minions drop each time they hit a wall.
//              Wave 1: 4 + 1*3 = 7 px  (very gentle)
//              Wave 8: 4 + 8*3 = 28 px (meaningful but survivable)
//              Old formula was wave*8 → Wave 1=8, Wave 8=64 (way too aggressive)
//
// SWARM_DX_BASE — horizontal speed per frame at wave 1.
//              Old: 0.3 + (wave-1)*0.1 → Wave 1=0.3, Wave 8=1.0
//              New: 0.25 + (wave-1)*0.07 → Wave 1=0.25, Wave 8=0.74 (25% slower ramp)
//
// ENEMY_FIRE_CHANCE — probability any live minion fires per frame.
//              Reduced baseline so early waves are less bullet-hellish.
//
// ─────────────────────────────────────────────────────────────────────────────
const DROP_BASE     = 4;   // px, fixed floor
const DROP_PER_WAVE = 3;   // px added per wave number

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.resetAll();

    this.minionImg   = new Image();
    this.minionImg.src = "assets/sprites/enemies/minion.png";

    this.minibossImg = new Image();
    this.minibossImg.src = "assets/sprites/bosses/miniboss.png";

    this.bossImg = new Image();
    this.bossImg.src = "assets/sprites/bosses/boss.png";
  }

  resetAll() {
    this.enemies  = [];
    this.drops    = [];
    this.swarm    = null;
    this.miniboss = null;
    this.boss     = null;
  }

  clearDrops() { this.drops = []; }

  launchWave(wave) {
    const definition = WAVE_DEFINITIONS[wave - 1];
    this.miniboss = null;
    this.boss     = null;
    this.swarm    = null;

    if      (definition.type === "minion")   this.spawnMinions(wave);
    else if (definition.type === "miniboss") this.spawnMiniboss(wave);
    else if (definition.type === "boss")     this.spawnBoss(wave);

    this.game.flashWave();
  }

  spawnMinions(wave) {
    const definition = WAVE_DEFINITIONS[wave - 1];
    const cw   = this.game.canvas.width;
    const padX = cw * MINION.edgePaddingRatio;
    const spacingX = (cw - padX * 2) / (MINION.columns - 1);
    const enemies = [];

    for (let row = 0; row < definition.rows; row += 1) {
      for (let col = 0; col < MINION.columns; col += 1) {
        enemies.push({
          x    : padX + col * spacingX,
          y    : MINION.startY + row * MINION.spacingY,
          w    : MINION.width,
          h    : MINION.height,
          alive: true,
          col,
          row,
          // HP: 1 for waves 1-5, then scales up gradually
          hp: wave >= 6 ? 1 + Math.floor((wave - 5) / 2) : 1,
        });
      }
    }

    this.enemies = enemies;
    this.swarm   = {
      // Smoother horizontal speed ramp (was 0.3 + (wave-1)*0.1)
      dx    : 0.25 + (wave - 1) * 0.07,
      // Gentler drop (was wave * 8 — e.g. wave 1 = 8px, now wave 1 = 7px, wave 8 = 28px)
      dropY : DROP_BASE + wave * DROP_PER_WAVE,
    };

    this.game.bulletManager.clearEnemy();
    this.drops = [];
    this.game.state.waveCleared = false;
  }

  spawnMiniboss(wave) {
    const hp = 8 + wave * 2;
    this.enemies = [];
    this.game.bulletManager.clearEnemy();
    this.drops = [];
    this.game.state.waveCleared = false;
    this.miniboss = {
      x            : this.game.canvas.width / 2,
      y            : 110,
      w            : 56,
      h            : 56,
      hp,
      maxHp        : hp,
      dx           : 0.8 + wave * 0.1,
      fireTimer    : 0,
      fireInterval : Math.max(55, 110 - wave * 6),
      alive        : true,
    };
  }

  spawnBoss(wave) {
    const hp = 60 + wave * 8;
    this.enemies = [];
    this.game.bulletManager.clearEnemy();
    this.drops = [];
    this.game.state.waveCleared = false;
    this.boss = {
      x            : this.game.canvas.width / 2,
      y            : 120,
      w            : 72,
      h            : 72,
      hp,
      maxHp        : hp,
      phase        : 1,
      dx           : 1.2,
      fireTimer    : 0,
      fireInterval : 35,
      wobble       : 0,
      alive        : true,
    };
  }

  trySpawnDrop(x, y) {
    const wave       = this.game.state.wave;
    const bombChance = 0.01 + wave * 0.012;
    const giftChance = 0.05 - wave * 0.003;
    const heartChance = 0.018;
    const roll = Math.random();

    if (roll < bombChance) {
      this.drops.push({ kind: "bomb",  x, y, vy: 2 + wave * 0.15, w: 28, h: 28, alive: true });
    } else if (roll < bombChance + heartChance) {
      this.drops.push({ kind: "heart", x, y, vy: 1.5,             w: 28, h: 28, alive: true });
    } else if (roll < bombChance + heartChance + giftChance) {
      const gifts = ["speed", "multi"];
      this.drops.push({
        kind : "gift",
        sub  : gifts[Math.floor(Math.random() * gifts.length)],
        x, y, vy: 1.8, w: 28, h: 28, alive: true,
      });
    }
  }

  updateDrops(canvas) {
    this.drops = this.drops.filter((d) => d.alive && d.y < canvas.height + 40);
    this.drops.forEach((d) => { d.y += d.vy; });
  }

  update() {
    if (this.swarm)                        this.updateSwarm();
    if (this.miniboss && this.miniboss.alive) this.updateMiniboss();
    if (this.boss     && this.boss.alive)     this.updateBoss();
  }

  updateSwarm() {
    const alive = this.enemies.filter((e) => e.alive);
    if (alive.length === 0) { this.game.waveOver(); return; }

    let hitWall = false;
    alive.forEach((e) => {
      e.x += this.swarm.dx;
      if (e.x > this.game.canvas.width - 20 || e.x < 20) hitWall = true;

      // Reduced fire chance baseline: was 0.00008 → 0.00005
      const fireChance = 0.00005 + this.game.state.wave * 0.00006;
      if (Math.random() < fireChance) {
        const lowest = alive
          .filter((c) => c.col === e.col)
          .sort((a, b) => b.y - a.y)[0];
        if (lowest === e) {
          this.game.bulletManager.shootAt(
            e.x, e.y + 18,
            this.game.player.x, this.game.player.y,
            // Slightly slower enemy bullets in early waves
            2.5 + this.game.state.wave * 0.25,
          );
        }
      }

      if (Math.random() < 0.00015) this.trySpawnDrop(e.x, e.y);
    });

    if (hitWall) {
      this.swarm.dx *= -1;
      alive.forEach((e) => { e.y += this.swarm.dropY; });

      // Game-over trigger: any minion enters the bottom touch-control zone
      if (alive.some((e) => e.y > this.game.canvas.height - 150)) {
        this.game.end(false);
      }
    }
  }

  updateMiniboss() {
    const mb = this.miniboss;
    mb.x += mb.dx;
    if (mb.x > this.game.canvas.width - mb.w / 2 || mb.x < mb.w / 2) mb.dx *= -1;

    mb.fireTimer += 1;
    if (mb.fireTimer >= mb.fireInterval) {
      mb.fireTimer = 0;
      const wave  = this.game.state.wave;
      const shots = wave >= 6 ? [-1, 0, 1] : wave >= 4 ? [-1, 1] : [0];
      shots.forEach((offset) => {
        this.game.bulletManager.shootAt(
          mb.x + offset * 18, mb.y + 30,
          this.game.player.x, this.game.player.y,
          2.5 + wave * 0.15,
        );
      });
      if (Math.random() < 0.2) this.trySpawnDrop(mb.x, mb.y + 30);
    }

    if (mb.hp < mb.maxHp * 0.5 && Math.random() < 0.002) {
      this.trySpawnDrop(mb.x + (Math.random() - 0.5) * 80, mb.y + 50);
    }
  }

  updateBoss() {
    const boss = this.boss;
    boss.wobble += 0.04;
    boss.x += boss.dx * (1 + Math.sin(boss.wobble) * 0.3);
    if (boss.x > this.game.canvas.width - boss.w / 2 || boss.x < boss.w / 2) boss.dx *= -1;
    boss.y = 120 + Math.sin(boss.wobble * 0.7) * 18;

    if (boss.hp < boss.maxHp * 0.5) boss.fireInterval = 22;

    boss.fireTimer += 1;
    if (boss.fireTimer >= boss.fireInterval) {
      boss.fireTimer = 0;
      const shotCount = boss.phase === 2 ? 5 : 3;
      for (let i = 0; i < shotCount; i += 1) {
        this.game.bulletManager.shootAt(
          boss.x + (i - (shotCount - 1) / 2) * 24, boss.y + 40,
          this.game.player.x + (Math.random() - 0.5) * 60, this.game.player.y,
          5 + this.game.state.wave * 0.2,
        );
      }
      if (Math.random() < 0.4)  this.trySpawnDrop(boss.x + (Math.random() - 0.5) * 100, boss.y + 50);
      if (Math.random() < 0.15) this.trySpawnDrop(boss.x + (Math.random() - 0.5) * 100, boss.y + 50);
    }
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  render(ctx) {
    this.renderDrops(ctx);
    this.renderMinions(ctx);
    this.renderMiniboss(ctx);
    this.renderBoss(ctx);
  }

  renderDrops(ctx) {
    this.drops.forEach((drop) => {
      if (!drop.alive) return;

      if (drop.kind === "bomb") {
        drawEmoji(ctx, SYMBOLS.bomb, drop.x, drop.y, 24);
        return;
      }

      if (drop.kind === "heart") {
        drawEmoji(ctx, SYMBOLS.heart, drop.x, drop.y, 24);
        ctx.save();
        ctx.strokeStyle  = "#FF4466";
        ctx.globalAlpha  = 0.5;
        ctx.lineWidth    = 2;
        ctx.beginPath();
        ctx.arc(drop.x, drop.y, 18, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return;
      }

      drawEmoji(ctx, drop.sub === "speed" ? SYMBOLS.lightning : SYMBOLS.gift, drop.x, drop.y, 22);
      ctx.save();
      ctx.strokeStyle = COLORS.gold;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  renderMinions(ctx) {
    this.enemies.forEach((e) => {
      if (!e.alive) return;
      if (this.minionImg.complete && this.minionImg.naturalWidth > 0) {
        ctx.drawImage(this.minionImg, e.x - e.w / 2, e.y - e.h / 2, e.w, e.h);
      } else {
        drawEmoji(ctx, SYMBOLS.devil, e.x, e.y, 28);
      }
    });
  }

  renderMiniboss(ctx) {
    if (!this.miniboss || !this.miniboss.alive) return;
    const mb = this.miniboss;
    drawHpBar(ctx, mb.x, mb.y - mb.h / 2 - 14, mb.hp, mb.maxHp, COLORS.orange, 100);
    if (this.minibossImg.complete && this.minibossImg.naturalWidth > 0) {
      ctx.drawImage(this.minibossImg, mb.x - mb.w / 2, mb.y - mb.h / 2, mb.w, mb.h);
    } else {
      drawEmoji(ctx, SYMBOLS.imp, mb.x, mb.y, 48);
    }
    drawLabel(ctx, "MINIBOSS", mb.x, mb.y + mb.h / 2 + 12, COLORS.orange);
  }

  renderBoss(ctx) {
    if (!this.boss || !this.boss.alive) return;
    const boss = this.boss;
    drawHpBar(ctx, boss.x, boss.y - boss.h / 2 - 18, boss.hp, boss.maxHp, COLORS.red, 140);
    if (this.bossImg.complete && this.bossImg.naturalWidth > 0) {
      ctx.drawImage(this.bossImg, boss.x - boss.w / 2, boss.y - boss.h / 2, boss.w, boss.h);
    } else {
      drawEmoji(ctx, SYMBOLS.imp, boss.x, boss.y, 60);
    }
    drawLabel(ctx, "EVIL RENJITHA", boss.x, boss.y + boss.h / 2 + 14, COLORS.red);
  }
}
