import { COLORS, createParticleBurst } from "./utils.js";

export function overlap(a, b) {
  return Math.abs(a.x - b.x) < a.w / 2 + b.w / 2
    && Math.abs(a.y - b.y) < a.h / 2 + b.h / 2;
}

export class CollisionSystem {
  constructor(game) {
    this.game = game;
  }

  update() {
    this.handlePlayerBulletsVsMinions();
    this.handlePlayerBulletsVsMiniboss();
    this.handlePlayerBulletsVsBoss();
    this.handlePlayerVsDrops();
    this.handlePlayerVsEnemyBullets();
  }

  handlePlayerBulletsVsMinions() {
    if (!this.game.enemyManager.swarm) {
      return;
    }

    this.game.bulletManager.playerBullets.forEach((bullet, bulletIndex) => {
      this.game.enemyManager.enemies.forEach((enemy) => {
        if (!enemy.alive) {
          return;
        }

        if (overlap(bullet, enemy)) {
          enemy.hp -= 1;
          this.game.bulletManager.playerBullets.splice(bulletIndex, 1);
          this.game.addBurst(enemy.x, enemy.y, COLORS.red, 6);

          if (enemy.hp <= 0) {
            enemy.alive = false;
            this.game.state.score += 10 * this.game.state.wave;
            this.game.enemyManager.trySpawnDrop(enemy.x, enemy.y);
            this.game.syncHud();
          }
        }
      });
    });
  }

  handlePlayerBulletsVsMiniboss() {
    const miniboss = this.game.enemyManager.miniboss;
    if (!miniboss || !miniboss.alive) {
      return;
    }

    this.game.bulletManager.playerBullets.forEach((bullet, bulletIndex) => {
      if (overlap(bullet, miniboss)) {
        miniboss.hp -= 1;
        this.game.bulletManager.playerBullets.splice(bulletIndex, 1);
        this.game.addBurst(bullet.x, bullet.y, COLORS.orange, 4);
        this.game.state.score += 5 * this.game.state.wave;
        this.game.syncHud();

        if (miniboss.hp <= 0) {
          miniboss.alive = false;
          this.game.addBurst(miniboss.x, miniboss.y, COLORS.orange, 25);
          this.game.schedule(() => this.game.waveOver(), 800);
        }
      }
    });
  }

  handlePlayerBulletsVsBoss() {
    const boss = this.game.enemyManager.boss;
    if (!boss || !boss.alive) {
      return;
    }

    this.game.bulletManager.playerBullets.forEach((bullet, bulletIndex) => {
      if (overlap(bullet, boss)) {
        boss.hp -= 1;
        this.game.bulletManager.playerBullets.splice(bulletIndex, 1);
        this.game.addBurst(bullet.x, bullet.y, COLORS.gold, 4);
        this.game.state.score += 8;
        this.game.syncHud();

        if (boss.hp <= 0) {
          boss.alive = false;
          this.game.addBurst(boss.x, boss.y, COLORS.gold, 40);
          this.game.schedule(() => this.game.end(true), 1200);
        }
      }
    });
  }

  handlePlayerVsDrops() {
    const player = this.game.player;
    if (!player || player.shield !== 0) {
      return;
    }

    this.game.enemyManager.drops.forEach((drop) => {
      if (!drop.alive) {
        return;
      }

      if (overlap(player, drop)) {
        drop.alive = false;

        if (drop.kind === "bomb") {
          this.game.damagePlayer(COLORS.red, 14);
        } else {
          this.game.applyGift(drop.sub);
          this.game.addBurst(player.x, player.y, COLORS.gold, 10);
        }
      }
    });
  }

  handlePlayerVsEnemyBullets() {
    const player = this.game.player;
    if (!player || player.shield !== 0) {
      return;
    }

    this.game.bulletManager.enemyBullets.forEach((bullet, bulletIndex) => {
      if (overlap(player, bullet)) {
        this.game.bulletManager.enemyBullets.splice(bulletIndex, 1);
        this.game.damagePlayer(player.color, 12);
      }
    });
  }
}
