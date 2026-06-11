import {
  COLORS,
  SYMBOLS,
  WAVE_DEFINITIONS,
  drawEmoji,
  drawHpBar,
  drawLabel,
} from "./utils.js";

const MINION = Object.freeze({
  columns: 7,
  width: 34,
  height: 34,
  startY: 80,
  spacingY: 50,
  edgePaddingRatio: 0.06,
});

export class EnemyManager {
  constructor(game) {
    this.game = game;
    this.resetAll();

    this.minionImg = new Image();
    this.minionImg.src = "assets/sprites/enemies/minion.png";

    this.minibossImg = new Image();
    this.minibossImg.src = "assets/sprites/bosses/miniboss.png";

    this.bossImg = new Image();
    this.bossImg.src = "assets/sprites/bosses/boss.png";
  }

  resetAll() {
    this.enemies = [];
    this.drops = [];
    this.swarm = null;
    this.miniboss = null;
    this.boss = null;
  }

  clearDrops() {
    this.drops = [];
  }

  launchWave(wave) {
    const definition = WAVE_DEFINITIONS[wave - 1];
    this.miniboss = null;
    this.boss = null;
    this.swarm = null;

    if (definition.type === "minion") {
      this.spawnMinions(wave);
    } else if (definition.type === "miniboss") {
      this.spawnMiniboss(wave);
    } else if (definition.type === "boss") {
      this.spawnBoss(wave);
    }

    this.game.flashWave();
  }

  spawnMinions(wave) {
    const definition = WAVE_DEFINITIONS[wave - 1];
    const canvasWidth = this.game.canvas.width;
    const padX = canvasWidth * MINION.edgePaddingRatio;
    const spacingX = (canvasWidth - padX * 2) / (MINION.columns - 1);
    const enemies = [];

    for (let row = 0; row < definition.rows; row += 1) {
      for (let column = 0; column < MINION.columns; column += 1) {
        enemies.push({
          x: padX + column * spacingX,
          y: MINION.startY + row * MINION.spacingY,
          w: MINION.width,
          h: MINION.height,
          alive: true,
          col: column,
          row,
          hp: wave >= 6 ? 1 + Math.floor((wave - 5) / 2) : 1,
        });
      }
    }

    this.enemies = enemies;
    this.swarm = {
      dx: 0.3 + (wave - 1) * 0.1,
      dropY: wave * 8,
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
      x: this.game.canvas.width / 2,
      y: 110,
      w: 56,
      h: 56,
      hp,
      maxHp: hp,
      dx: 0.8 + wave * 0.1,
      fireTimer: 0,
      fireInterval: Math.max(55, 110 - wave * 6),
      alive: true,
    };
  }

  spawnBoss(wave) {
    const hp = 60 + wave * 8;
    this.enemies = [];
    this.game.bulletManager.clearEnemy();
    this.drops = [];
    this.game.state.waveCleared = false;
    this.boss = {
      x: this.game.canvas.width / 2,
      y: 120,
      w: 72,
      h: 72,
      hp,
      maxHp: hp,
      phase: 1,
      dx: 1.2,
      fireTimer: 0,
      fireInterval: 35,
      wobble: 0,
      alive: true,
    };
  }

  trySpawnDrop(x, y) {
    const wave = this.game.state.wave;
    const bombChance = 0.01 + wave * 0.012;
    const giftChance = 0.05 - wave * 0.003;
    const heartChance = 0.018;
    const roll = Math.random();

    if (roll < bombChance) {
      this.drops.push({ kind: "bomb", x, y, vy: 2 + wave * 0.15, w: 28, h: 28, alive: true });
    } else if (roll < bombChance + heartChance) {
      this.drops.push({ kind: "heart", x, y, vy: 1.5, w: 28, h: 28, alive: true });
    } else if (roll < bombChance + heartChance + giftChance) {
      const gifts = ["speed", "multi"];
      this.drops.push({
        kind: "gift",
        sub: gifts[Math.floor(Math.random() * gifts.length)],
        x,
        y,
        vy: 1.8,
        w: 28,
        h: 28,
        alive: true,
      });
    }
  }

  updateDrops(canvas) {
    this.drops = this.drops.filter((drop) => drop.alive && drop.y < canvas.height + 40);
    this.drops.forEach((drop) => {
      drop.y += drop.vy;
    });
  }

  update() {
    if (this.swarm) {
      this.updateSwarm();
    }
    if (this.miniboss && this.miniboss.alive) {
      this.updateMiniboss();
    }
    if (this.boss && this.boss.alive) {
      this.updateBoss();
    }
  }

  updateSwarm() {
    const alive = this.enemies.filter((enemy) => enemy.alive);
    if (alive.length === 0) {
      this.game.waveOver();
      return;
    }

    let hitWall = false;
    alive.forEach((enemy) => {
      enemy.x += this.swarm.dx;
      if (enemy.x > this.game.canvas.width - 20 || enemy.x < 20) {
        hitWall = true;
      }

      const fireChance = 0.00008 + this.game.state.wave * 0.00008;
      if (Math.random() < fireChance) {
        const lowest = alive
          .filter((candidate) => candidate.col === enemy.col)
          .sort((a, b) => b.y - a.y)[0];
        if (lowest === enemy) {
          this.game.bulletManager.shootAt(
            enemy.x,
            enemy.y + 18,
            this.game.player.x,
            this.game.player.y,
            3 + this.game.state.wave * 0.3,
          );
        }
      }

      if (Math.random() < 0.00015) {
        this.trySpawnDrop(enemy.x, enemy.y);
      }
    });

    if (hitWall) {
      this.swarm.dx *= -1;
      alive.forEach((enemy) => {
        enemy.y += this.swarm.dropY;
      });
      if (alive.some((enemy) => enemy.y > this.game.canvas.height - 150)) {
        this.game.end(false);
      }
    }
  }

  updateMiniboss() {
    const miniboss = this.miniboss;
    miniboss.x += miniboss.dx;
    if (miniboss.x > this.game.canvas.width - miniboss.w / 2 || miniboss.x < miniboss.w / 2) {
      miniboss.dx *= -1;
    }

    miniboss.fireTimer += 1;
    if (miniboss.fireTimer >= miniboss.fireInterval) {
      miniboss.fireTimer = 0;
      const shots = this.game.state.wave >= 6 ? [-1, 0, 1] : this.game.state.wave >= 4 ? [-1, 1] : [0];
      shots.forEach((offset) => {
        this.game.bulletManager.shootAt(
          miniboss.x + offset * 18,
          miniboss.y + 30,
          this.game.player.x,
          this.game.player.y,
          2.5 + this.game.state.wave * 0.15,
        );
      });

      if (Math.random() < 0.2) {
        this.trySpawnDrop(miniboss.x, miniboss.y + 30);
      }
    }

    if (miniboss.hp < miniboss.maxHp * 0.5 && Math.random() < 0.002) {
      this.trySpawnDrop(miniboss.x + (Math.random() - 0.5) * 80, miniboss.y + 50);
    }
  }

  updateBoss() {
    const boss = this.boss;
    boss.wobble += 0.04;
    boss.x += boss.dx * (1 + Math.sin(boss.wobble) * 0.3);
    if (boss.x > this.game.canvas.width - boss.w / 2 || boss.x < boss.w / 2) {
      boss.dx *= -1;
    }
    boss.y = 120 + Math.sin(boss.wobble * 0.7) * 18;

    if (boss.hp < boss.maxHp * 0.5) {
      boss.fireInterval = 22;
    }

    boss.fireTimer += 1;
    if (boss.fireTimer >= boss.fireInterval) {
      boss.fireTimer = 0;
      const shotCount = boss.phase === 2 ? 5 : 3;
      for (let index = 0; index < shotCount; index += 1) {
        this.game.bulletManager.shootAt(
          boss.x + (index - (shotCount - 1) / 2) * 24,
          boss.y + 40,
          this.game.player.x + (Math.random() - 0.5) * 60,
          this.game.player.y,
          5 + this.game.state.wave * 0.2,
        );
      }

      if (Math.random() < 0.4) {
        this.trySpawnDrop(boss.x + (Math.random() - 0.5) * 100, boss.y + 50);
      }
      if (Math.random() < 0.15) {
        this.trySpawnDrop(boss.x + (Math.random() - 0.5) * 100, boss.y + 50);
      }
    }
  }

  render(ctx) {
    this.renderDrops(ctx);
    this.renderMinions(ctx);
    this.renderMiniboss(ctx);
    this.renderBoss(ctx);
  }

  renderDrops(ctx) {
    this.drops.forEach((drop) => {
      if (!drop.alive) {
        return;
      }

      if (drop.kind === "bomb") {
        drawEmoji(ctx, SYMBOLS.bomb, drop.x, drop.y, 24);
        return;
      }

      if (drop.kind === "heart") {
        drawEmoji(ctx, SYMBOLS.heart, drop.x, drop.y, 24);
        ctx.save();
        ctx.strokeStyle = "#FF4466";
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 2;
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
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(drop.x, drop.y, 18, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  renderMinions(ctx) {
    this.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      if (this.minionImg.complete && this.minionImg.naturalWidth > 0) {
        ctx.drawImage(this.minionImg, enemy.x - enemy.w / 2, enemy.y - enemy.h / 2, enemy.w, enemy.h);
      } else {
        drawEmoji(ctx, SYMBOLS.devil, enemy.x, enemy.y, 28);
      }
    });
  }

  renderMiniboss(ctx) {
    if (!this.miniboss || !this.miniboss.alive) return;

    drawHpBar(ctx, this.miniboss.x, this.miniboss.y - this.miniboss.h / 2 - 14, this.miniboss.hp, this.miniboss.maxHp, COLORS.orange, 100);

    if (this.minibossImg.complete && this.minibossImg.naturalWidth > 0) {
      ctx.drawImage(this.minibossImg, this.miniboss.x - this.miniboss.w / 2, this.miniboss.y - this.miniboss.h / 2, this.miniboss.w, this.miniboss.h);
    } else {
      drawEmoji(ctx, SYMBOLS.imp, this.miniboss.x, this.miniboss.y, 48);
    }

    drawLabel(ctx, "MINIBOSS", this.miniboss.x, this.miniboss.y + this.miniboss.h / 2 + 12, COLORS.orange);
  }

  renderBoss(ctx) {
    if (!this.boss || !this.boss.alive) return;

    drawHpBar(ctx, this.boss.x, this.boss.y - this.boss.h / 2 - 18, this.boss.hp, this.boss.maxHp, COLORS.red, 140);

    if (this.bossImg.complete && this.bossImg.naturalWidth > 0) {
      ctx.drawImage(this.bossImg, this.boss.x - this.boss.w / 2, this.boss.y - this.boss.h / 2, this.boss.w, this.boss.h);
    } else {
      drawEmoji(ctx, SYMBOLS.imp, this.boss.x, this.boss.y, 60);
    }

    drawLabel(ctx, "EVIL RENJITHA", this.boss.x, this.boss.y + this.boss.h / 2 + 14, COLORS.red);
  }
}
