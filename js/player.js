import { PLAYER_PROFILES, SYMBOLS, clamp, drawEmoji } from "./utils.js";

const PLAYER_SIZE = Object.freeze({
  width: 54,
  height: 54,
  spriteWidth: 64,
  startBottomOffset: 160,
  fallbackRingRadius: 26,
  fallbackIconSize: 38,
  shieldFrames: 90,
});

export class Player {
  constructor(profileKey, canvas) {
    const profile = PLAYER_PROFILES[profileKey] ?? PLAYER_PROFILES.sachin;

    this.profileKey = profile.id;
    this.emoji = profile.emoji;
    this.color = profile.color;
    this.ship = profile.shipSrc;
    this.shipImg = null;

    this.x = canvas.width / 2;
    this.y = canvas.height - PLAYER_SIZE.startBottomOffset;
    this.w = PLAYER_SIZE.width;
    this.h = PLAYER_SIZE.height;
    this.vx = 0;
    this.shield = 0;

    this.preloadShip();
  }

  preloadShip() {
    const image = new Image();
    image.onload = () => {
      this.shipImg = image;
    };
    image.src = this.ship;
  }

  updateMovement(inputX, wave, canvas, powerUps) {
    // Base speed + upgrade bonus
    const speedBonus = (powerUps && powerUps.moveSpeedBonus) ? powerUps.moveSpeedBonus : 0;
    this.vx = inputX * (5 + wave * 0.1 + speedBonus);
    this.x += this.vx;
    this.x = clamp(this.x, this.w / 2, canvas.width - this.w / 2);
  }

  tickShield() {
    if (this.shield > 0) {
      this.shield -= 1;
    }
  }

  activateShield() {
    this.shield = PLAYER_SIZE.shieldFrames;
  }

  shoot(bulletManager, powerUps) {
    return bulletManager.fireFromPlayer(this, powerUps);
  }

  render(ctx) {
    const visible = this.shield === 0 || Math.floor(this.shield / 7) % 2 === 0;
    if (!visible) {
      return;
    }

    if (this.shipImg) {
      const width = PLAYER_SIZE.spriteWidth;
      const height = Math.round(width * (this.shipImg.naturalHeight / this.shipImg.naturalWidth));
      // NO shadow/glow — clean crisp render
      ctx.drawImage(this.shipImg, this.x - width / 2, this.y - height / 2, width, height);
      return;
    }

    // Fallback: ring + emoji (no glow)
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, PLAYER_SIZE.fallbackRingRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawEmoji(ctx, this.emoji || SYMBOLS.brain, this.x, this.y, PLAYER_SIZE.fallbackIconSize);
  }
}
