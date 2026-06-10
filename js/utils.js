export const COLORS = Object.freeze({
  background: "#050508",
  gold: "#FFD600",
  red: "#FF2D20",
  orange: "#FF9900",
  whiteStar: "rgba(255,255,255,0.55)",
});

export const SYMBOLS = Object.freeze({
  bomb: "\u{1F4A3}",
  brain: "\u{1F9E0}",
  crown: "\u{1F451}",
  devil: "\u{1F608}",
  fire: "\u{1F525}",
  gift: "\u{1F381}",
  imp: "\u{1F47F}",
  lightning: "\u26A1",
  skull: "\u{1F480}",
});

export const MAX_LIVES = 3;

export const WAVE_DEFINITIONS = Object.freeze([
  { type: "minion", rows: 1 },
  { type: "minion", rows: 2 },
  { type: "miniboss" },
  { type: "minion", rows: 3 },
  { type: "minion", rows: 4 },
  { type: "miniboss" },
  { type: "minion", rows: 5 },
  { type: "minion", rows: 6 },
  { type: "miniboss" },
  { type: "boss" },
]);

export const PLAYER_PROFILES = Object.freeze({
  sachin: {
    id: "sachin",
    emoji: SYMBOLS.brain,
    color: "#00FF88",
    shipSrc: new URL("../assets/sprites/player/sachin-ship.png", import.meta.url).href,
  },
  vishruth: {
    id: "vishruth",
    emoji: SYMBOLS.lightning,
    color: "#9B30FF",
    shipSrc: new URL("../assets/sprites/player/vishruth-ship.png", import.meta.url).href,
  },
});

export const CONTROL_CONFIG = Object.freeze({
  joystickRadius: 36,
});

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function formatTime(ms = 0) {
  const minutes = String(Math.floor(ms / 60000)).padStart(2, "0");
  const seconds = String(Math.floor((ms % 60000) / 1000)).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function createStars(count = 90) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * 1200,
    y: Math.random() * 2400,
    r: Math.random() * 1.4 + 0.3,
    spd: 0.3 + Math.random() * 0.5,
  }));
}

export function createParticleBurst(particles, x, y, color, count = 10) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 40 + Math.random() * 20,
      maxLife: 60,
      r: 2 + Math.random() * 3,
      color,
    });
  }
}

export function drawEmoji(ctx, symbol, x, y, size, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${size}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbol, x, y);
  ctx.restore();
}

export function drawLabel(ctx, text, x, y, color) {
  ctx.save();
  ctx.font = "700 9px Space Mono, monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawHpBar(ctx, centerX, y, hp, maxHp, color, width) {
  const left = centerX - width / 2;
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(left, y, width, 6);
  ctx.fillStyle = color;
  ctx.fillRect(left, y, width * (hp / maxHp), 6);
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(left, y, width, 6);
}
