const PLAYER_BULLET = Object.freeze({
  width: 6,
  height: 16,
  speed: 11,
  spread: 14,
  startYOffset: 24,
});

const ENEMY_BULLET = Object.freeze({
  size: 9,
});

export class BulletManager {
  constructor() {
    this.playerBullets = [];
    this.enemyBullets = [];
  }

  reset() {
    this.playerBullets = [];
    this.enemyBullets = [];
  }

  clearEnemy() {
    this.enemyBullets = [];
  }

  getReloadDuration(powerUps) {
    return Math.max(6, powerUps.reloadBase - powerUps.reloadBonus);
  }

  tickReload(powerUps) {
    if (powerUps.reloadTimer > 0) {
      powerUps.reloadTimer -= 1;
    }
  }

  getReloadPercent(powerUps) {
    const reloadDuration = this.getReloadDuration(powerUps);
    if (powerUps.reloadTimer <= 0) {
      return 100;
    }
    return Math.round((1 - powerUps.reloadTimer / reloadDuration) * 100);
  }

  fireFromPlayer(player, powerUps) {
    if (powerUps.reloadTimer > 0) {
      return false;
    }

    powerUps.reloadTimer = this.getReloadDuration(powerUps);
    const offsets = this.getShotOffsets(powerUps.bulletCount);
    const speedBonus = powerUps.bulletSpeedBonus || 0;
    offsets.forEach((offsetX) => {
      this.playerBullets.push({
        x: player.x + offsetX,
        y: player.y - PLAYER_BULLET.startYOffset,
        w: PLAYER_BULLET.width,
        h: PLAYER_BULLET.height,
        speed: PLAYER_BULLET.speed + speedBonus,
        vx: offsetX * 0.07,
      });
    });
    return true;
  }

  getShotOffsets(count) {
    if (count === 1) {
      return [0];
    }

    return Array.from({ length: count }, (_, index) => {
      return (index - (count - 1) / 2) * PLAYER_BULLET.spread;
    });
  }

  shootAt(fromX, fromY, targetX, targetY, speed) {
    const dx = targetX - fromX;
    const dy = targetY - fromY;
    const length = Math.hypot(dx, dy) || 1;
    this.enemyBullets.push({
      x: fromX,
      y: fromY,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      speed: 0,
      w: ENEMY_BULLET.size,
      h: ENEMY_BULLET.size,
    });
  }

  preUpdateEnemyBullets() {
    this.enemyBullets.forEach((bullet) => {
      if (bullet.speed === 0) {
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
      } else {
        bullet.y += bullet.speed;
      }
    });
  }

  // Accepts powerUps so bulletSpeedBonus is reflected on newly spawned bullets
  updatePlayerBullets(powerUps) {
    this.playerBullets = this.playerBullets.filter((bullet) => bullet.y > -30);
    this.playerBullets.forEach((bullet) => {
      bullet.y -= bullet.speed;
      bullet.x += bullet.vx || 0;
    });
  }

  updateEnemyBullets(canvas) {
    this.enemyBullets = this.enemyBullets.filter((bullet) => bullet.y < canvas.height + 20);
    this.enemyBullets.forEach((bullet) => {
      bullet.x += bullet.vx || 0;
      bullet.y += bullet.speed;
    });
  }

  render(ctx, playerColor) {
    this.enemyBullets.forEach((bullet) => {
      ctx.save();
      ctx.fillStyle = "#FF2D20";
      ctx.shadowColor = "#FF2D20";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    this.playerBullets.forEach((bullet) => {
      ctx.save();
      ctx.fillStyle = playerColor;
      ctx.shadowColor = playerColor;
      ctx.shadowBlur = 7;
      ctx.fillRect(bullet.x - bullet.w / 2, bullet.y, bullet.w, bullet.h);
      ctx.restore();
    });
  }
}
