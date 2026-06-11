import { LOGICAL_W, LOGICAL_H, PLAYER_PROFILES, SYMBOLS, clamp, drawEmoji } from "./utils.js";

const PLAYER_SIZE = Object.freeze({
  width              : 54,
  height             : 54,
  spriteWidth        : 64,
  startBottomOffset  : 160,   // px from logical canvas bottom
  fallbackRingRadius : 26,
  fallbackIconSize   : 38,
  shieldFrames       : 90,
});

export class Player {
  constructor(profileKey, canvas) {
    const profile = PLAYER_PROFILES[profileKey] ?? PLAYER_PROFILES.sachin;

    this.profileKey = profile.id;
    this.emoji      = profile.emoji;
    this.color      = profile.color;
    this.ship       = profile.shipSrc;
    this.shipImg    = null;

    // Always spawn relative to logical height — independent of physical screen
    this.x = LOGICAL_W / 2;
    this.y = LOGICAL_H - PLAYER_SIZE.startBottomOffset;
    this.w = PLAYER_SIZE.width;
    this.h = PLAYER_SIZE.height;
    this.vx     = 0;
    this.shield = 0;

    this.preloadShip();
  }

  preloadShip() {
    const img  = new Image();
    img.onload = () => { this.shipImg = img; };
    img.src    = this.ship;   // plain relative path — no import.meta.url
  }

  updateMovement(inputX, wave, canvas) {
    this.vx = inputX * (5 + wave * 0.1);
    this.x += this.vx;
    this.x  = clamp(this.x, this.w / 2, canvas.width - this.w / 2);
  }

  tickShield()    { if (this.shield > 0) this.shield -= 1; }
  activateShield() { this.shield = PLAYER_SIZE.shieldFrames; }

  shoot(bulletManager, powerUps) {
    bulletManager.fireFromPlayer(this, powerUps);
  }

  render(ctx) {
    const visible = this.shield === 0 || Math.floor(this.shield / 7) % 2 === 0;
    if (!visible) return;

    if (this.shipImg) {
      const w = PLAYER_SIZE.spriteWidth;
      const h = Math.round(w * (this.shipImg.naturalHeight / this.shipImg.naturalWidth));
      ctx.save();
      ctx.shadowColor = this.color;
      ctx.shadowBlur  = 18;
      ctx.drawImage(this.shipImg, this.x - w / 2, this.y - h / 2, w, h);
      ctx.restore();
      return;
    }

    // Fallback: ring + emoji
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, PLAYER_SIZE.fallbackRingRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawEmoji(ctx, this.emoji || SYMBOLS.heart, this.x, this.y, PLAYER_SIZE.fallbackIconSize);
  }
}
