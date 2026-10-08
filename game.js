// Arkanoid MVP — ver specs/01-mvp-jugable.md

const CANVAS_W = 640, CANVAS_H = 600;
const HUD_H = 60;
const BLOCKS_MARGIN_X = 40;
const BLOCK_W = (CANVAS_W - 2 * BLOCKS_MARGIN_X) / 10, BLOCK_H = 32;
const BLOCK_COLS = 10;
const BLOCKS_TOP = 80;
const ROW_COLORS = ['red', 'yellow', 'cyan', 'magenta', 'hotpink', 'green'];
const ROW_POINTS = [60, 50, 40, 30, 20, 10];
const PADDLE_W = 120, PADDLE_H = 14;
const PADDLE_Y = 560;
const PADDLE_SPEED = 480;
const BALL_R = 8;
const BALL_SPEED = 360;
const LAUNCH_ANGLE = 15;
const MAX_BOUNCE_ANGLE = 60;
const INITIAL_LIVES = 3;
const MAX_DT = 1 / 30;
const END_INPUT_LOCK = 500;
const SOUND_BOUNCE_SRC = 'assets/sounds/ball-bounce.mp3';
const SOUND_BREAK_SRC = 'assets/sounds/break-sound.mp3';
const SOUND_VOLUME = 0.5;
const EXPLOSION_FRAME_COUNT = 4;
const PARTICLES_PER_BLOCK = 8;
const PARTICLE_SIZE = 4;
const PARTICLE_DURATION = 400;
const PARTICLE_SPEED_MIN = 80;
const PARTICLE_SPEED_MAX = 220;
const PARTICLE_GRAVITY = 600;
const LEVEL_SPEED_STEP = 0.08;
const PARTICLE_COLORS = {
  red: '#c02a3e',
  yellow: '#d9bd4c',
  cyan: '#4fc99c',
  magenta: '#632ff4',
  hotpink: '#fc7d1c',
  green: '#44aaf3',
};

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const game = {
  status: 'ready',
  score: 0,
  lives: INITIAL_LIVES,
  endedAt: 0,
  paddle: { x: (CANVAS_W - PADDLE_W) / 2, y: PADDLE_Y, w: PADDLE_W, h: PADDLE_H },
  ball: { x: 0, y: 0, vx: 0, vy: 0 },
  blocks: [],
  explosions: [],
  particles: [],
  level: 1,
  paused: false,
};

const keys = {};

const sounds = {
  bounce: new Audio(SOUND_BOUNCE_SRC),
  break: new Audio(SOUND_BREAK_SRC),
};
for (const s of Object.values(sounds)) s.preload = 'auto';
let muted = false;

const toRad = deg => deg * Math.PI / 180;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function playSound(base) {
  if (muted) return;
  const a = base.cloneNode();
  a.volume = SOUND_VOLUME;
  a.play().catch(() => {});
}

// --- Estado ---

function ballSpeed() {
  return BALL_SPEED * (1 + LEVEL_SPEED_STEP * (game.level - 1));
}

function createBlocks(level) {
  const blocks = [];
  LEVELS[level - 1].forEach((line, row) => {
    for (let col = 0; col < BLOCK_COLS; col++) {
      const color = LEVEL_COLORS[line[col]];
      if (!color) continue;
      blocks.push({
        x: BLOCKS_MARGIN_X + col * BLOCK_W,
        y: BLOCKS_TOP + row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color,
        points: ROW_POINTS[ROW_COLORS.indexOf(color)],
        alive: true,
      });
    }
  });
  return blocks;
}

function attachBall() {
  game.ball.x = game.paddle.x + PADDLE_W / 2;
  game.ball.y = game.paddle.y - BALL_R;
  game.ball.vx = 0;
  game.ball.vy = 0;
}

function startLevel(level) {
  game.level = level;
  game.status = 'ready';
  game.blocks = createBlocks(level);
  game.explosions = [];
  game.particles = [];
  attachBall();
}

function resetGame() {
  game.paused = false;
  game.status = 'ready';
  game.score = 0;
  game.lives = INITIAL_LIVES;
  game.endedAt = 0;
  game.paddle.x = (CANVAS_W - PADDLE_W) / 2;
  startLevel(1);
}

function endGame(status) {
  game.status = status;
  game.endedAt = performance.now();
  game.ball.vx = 0;
  game.ball.vy = 0;
}

function launchBall() {
  game.ball.vx = ballSpeed() * Math.sin(toRad(LAUNCH_ANGLE));
  game.ball.vy = -ballSpeed() * Math.cos(toRad(LAUNCH_ANGLE));
  game.status = 'playing';
}

function restartAllowed() {
  return performance.now() - game.endedAt >= END_INPUT_LOCK;
}

// --- Entrada ---

const PREVENT_KEYS = ['ArrowLeft', 'ArrowRight', 'Space'];

window.addEventListener('keydown', e => {
  if (PREVENT_KEYS.includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (e.repeat) return;
  if (e.code === 'KeyM') muted = !muted;
  if ((e.code === 'KeyP' || e.code === 'Escape') && (game.status === 'ready' || game.status === 'playing')) {
    game.paused = !game.paused;
    return;
  }
  if (game.paused) {
    const n = e.code.startsWith('Digit') ? Number(e.code.slice(5)) : 0;
    if (n >= 1 && n <= LEVEL_COUNT) {
      startLevel(n);
      game.paused = false;
    }
    return;
  }
  if (e.code === 'Space' && game.status === 'ready') launchBall();
  if (e.code === 'Enter' && (game.status === 'won' || game.status === 'lost') && restartAllowed()) resetGame();
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

window.addEventListener('blur', () => {
  for (const k in keys) keys[k] = false;
});

canvas.addEventListener('mousemove', e => {
  if (game.paused || (game.status !== 'ready' && game.status !== 'playing')) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = (e.clientX - rect.left - canvas.clientLeft) * (CANVAS_W / canvas.clientWidth);
  game.paddle.x = clamp(mouseX - PADDLE_W / 2, 0, CANVAS_W - PADDLE_W);
});

canvas.addEventListener('mousedown', e => {
  if (e.button !== 0 || game.paused) return;
  if (game.status === 'ready') launchBall();
  else if ((game.status === 'won' || game.status === 'lost') && restartAllowed()) resetGame();
});

// --- Actualización ---

function movePaddleByKeys(dt) {
  const left = keys.ArrowLeft || keys.KeyA;
  const right = keys.ArrowRight || keys.KeyD;
  const dir = (right ? 1 : 0) - (left ? 1 : 0);
  if (dir) game.paddle.x = clamp(game.paddle.x + dir * PADDLE_SPEED * dt, 0, CANVAS_W - PADDLE_W);
}

function bounceWalls(ball) {
  if (ball.x - BALL_R < 0) {
    ball.x = BALL_R;
    ball.vx = Math.abs(ball.vx);
    playSound(sounds.bounce);
  } else if (ball.x + BALL_R > CANVAS_W) {
    ball.x = CANVAS_W - BALL_R;
    ball.vx = -Math.abs(ball.vx);
    playSound(sounds.bounce);
  }
  if (ball.y - BALL_R < HUD_H) {
    ball.y = HUD_H + BALL_R;
    ball.vy = Math.abs(ball.vy);
    playSound(sounds.bounce);
  }
}

function bouncePaddle(ball, paddle) {
  if (ball.vy <= 0 || ball.y > paddle.y) return;
  const overlapsX = ball.x + BALL_R > paddle.x && ball.x - BALL_R < paddle.x + paddle.w;
  const overlapsY = ball.y + BALL_R >= paddle.y && ball.y - BALL_R <= paddle.y + paddle.h;
  if (!overlapsX || !overlapsY) return;
  ball.y = paddle.y - BALL_R;
  const offset = clamp((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2), -1, 1);
  const angle = toRad(offset * MAX_BOUNCE_ANGLE);
  ball.vx = ballSpeed() * Math.sin(angle);
  ball.vy = -ballSpeed() * Math.cos(angle);
  playSound(sounds.bounce);
}

function spawnParticles(block) {
  const x = block.x + block.w / 2;
  const y = block.y + block.h / 2;
  for (let i = 0; i < PARTICLES_PER_BLOCK; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = PARTICLE_SPEED_MIN + Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN);
    game.particles.push({
      x, y,
      vx: speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
      color: block.color,
      elapsed: 0,
    });
  }
}

function bounceBlock(ball) {
  let best = null, bestArea = 0, bestOx = 0, bestOy = 0;
  for (const b of game.blocks) {
    if (!b.alive) continue;
    const ox = Math.min(ball.x + BALL_R, b.x + b.w) - Math.max(ball.x - BALL_R, b.x);
    const oy = Math.min(ball.y + BALL_R, b.y + b.h) - Math.max(ball.y - BALL_R, b.y);
    if (ox <= 0 || oy <= 0) continue;
    if (ox * oy > bestArea) {
      best = b; bestArea = ox * oy; bestOx = ox; bestOy = oy;
    }
  }
  if (!best) return;

  const fromLeft = ball.x < best.x + best.w / 2;
  const fromTop = ball.y < best.y + best.h / 2;
  if (bestOx < bestOy) {
    ball.x += fromLeft ? -bestOx : bestOx;
    ball.vx = fromLeft ? -Math.abs(ball.vx) : Math.abs(ball.vx);
  } else {
    ball.y += fromTop ? -bestOy : bestOy;
    ball.vy = fromTop ? -Math.abs(ball.vy) : Math.abs(ball.vy);
  }

  best.alive = false;
  playSound(sounds.break);
  game.explosions.push({ x: best.x, y: best.y, w: best.w, h: best.h, color: best.color, elapsed: 0 });
  spawnParticles(best);
  game.score += best.points;
  if (!game.blocks.some(b => b.alive)) {
    if (game.level < LEVEL_COUNT) startLevel(game.level + 1);
    else endGame('won');
  }
}

function loseLife() {
  game.lives -= 1;
  if (game.lives > 0) {
    game.status = 'ready';
    attachBall();
  } else {
    endGame('lost');
  }
}

function updateExplosions(dt) {
  for (const ex of game.explosions) ex.elapsed += dt * 1000;
  game.explosions = game.explosions.filter(ex => ex.elapsed < EXPLOSION_DURATION);
}

function updateParticles(dt) {
  for (const p of game.particles) {
    p.elapsed += dt * 1000;
    p.vy += PARTICLE_GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  game.particles = game.particles.filter(p => p.elapsed < PARTICLE_DURATION);
}

function update(dt) {
  if (game.paused) return;
  updateExplosions(dt);
  updateParticles(dt);
  if (game.status === 'won' || game.status === 'lost') return;

  movePaddleByKeys(dt);

  const ball = game.ball;
  if (game.status === 'ready') {
    attachBall();
    return;
  }

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  bounceWalls(ball);
  bouncePaddle(ball, game.paddle);
  bounceBlock(ball);
  if (game.status === 'won') return;

  if (ball.y - BALL_R > CANVAS_H) loseLife();
}

// --- Dibujo ---

function drawCenteredText(text, y, size) {
  ctx.font = `${size}px monospace`;
  ctx.fillText(text, CANVAS_W / 2, y);
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';

  ctx.font = '20px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Puntos: ${game.score}`, 16, HUD_H / 2);
  ctx.textAlign = 'right';
  ctx.fillText(`Vidas: ${game.lives}`, CANVAS_W - 16, HUD_H / 2);
  ctx.textAlign = 'center';
  ctx.fillText(muted ? `Nivel ${game.level} - Silencio (M)` : `Nivel ${game.level}`, CANVAS_W / 2, HUD_H / 2);

  for (const b of game.blocks) {
    if (b.alive) drawSprite(ctx, `block_${b.color}`, b.x, b.y, b.w, b.h);
  }
  const frameMs = EXPLOSION_DURATION / EXPLOSION_FRAME_COUNT;
  for (const ex of game.explosions) {
    const i = Math.min(EXPLOSION_FRAME_COUNT - 1, Math.floor(ex.elapsed / frameMs));
    drawFrame(ctx, EXPLOSION_FRAMES[ex.color][i], ex.x, ex.y, ex.w, ex.h);
  }
  for (const pt of game.particles) {
    ctx.globalAlpha = 1 - pt.elapsed / PARTICLE_DURATION;
    ctx.fillStyle = PARTICLE_COLORS[pt.color];
    ctx.fillRect(
      Math.round(pt.x - PARTICLE_SIZE / 2),
      Math.round(pt.y - PARTICLE_SIZE / 2),
      PARTICLE_SIZE,
      PARTICLE_SIZE
    );
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  const p = game.paddle;
  drawSprite(ctx, 'paddle', p.x, p.y, p.w, p.h);
  drawSprite(ctx, 'ball', game.ball.x - BALL_R, game.ball.y - BALL_R, BALL_R * 2, BALL_R * 2);

  ctx.textAlign = 'center';
  if (game.status === 'ready') {
    drawCenteredText('Espacio o clic para lanzar', 400, 20);
  } else if (game.status === 'won' || game.status === 'lost') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#fff';
    drawCenteredText(game.status === 'won' ? '¡Ganaste!' : 'Game over', 250, 48);
    drawCenteredText(`Puntos: ${game.score}`, 310, 24);
    drawCenteredText('Pulsa Enter o haz clic para jugar de nuevo', 360, 18);
  }
  if (game.paused) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#fff';
    drawCenteredText('Pausa', 230, 48);
    drawCenteredText(`Nivel actual: ${game.level}`, 290, 24);
    drawCenteredText(`Pulsa 1-${LEVEL_COUNT} para ir a un nivel`, 340, 20);
    drawCenteredText('P o Esc para continuar', 380, 18);
  }
}

// --- Bucle ---

let lastTime = 0;

function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, MAX_DT);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

loadSpritesheet(() => {
  ctx.imageSmoothingEnabled = false;
  resetGame();
  requestAnimationFrame(now => {
    lastTime = now;
    frame(now);
  });
});
