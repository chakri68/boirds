import './style.css';

interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Params {
  count: number;
  visualRange: number;
  protectedRange: number;
  separation: number;
  alignment: number;
  cohesion: number;
  maxSpeed: number;
  minSpeed: number;
  turnFactor: number;
  edgeMargin: number;
  mouseRadius: number;
  mouseStrength: number;
}

const params: Params = {
  count: 300,
  visualRange: 60,
  protectedRange: 12,
  separation: 0.06,
  alignment: 0.05,
  cohesion: 0.0008,
  maxSpeed: 4,
  minSpeed: 2,
  turnFactor: 0.25,
  edgeMargin: 80,
  mouseRadius: 90,
  mouseStrength: 0.6,
};

const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const ctx = canvas.getContext('2d')!;

let width = 0;
let height = 0;
let dpr = Math.max(1, window.devicePixelRatio || 1);
let boids: Boid[] = [];
let trails = false;
const mouse = { x: -1e9, y: -1e9, active: false };

function resize() {
  dpr = Math.max(1, window.devicePixelRatio || 1);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function spawn(n: number) {
  boids = [];
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(params.minSpeed, params.maxSpeed);
    boids.push({
      x: rand(0, width),
      y: rand(0, height),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }
}

function syncCount(n: number) {
  if (n === boids.length) return;
  if (n < boids.length) {
    boids.length = n;
    return;
  }
  while (boids.length < n) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(params.minSpeed, params.maxSpeed);
    boids.push({
      x: rand(0, width),
      y: rand(0, height),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
    });
  }
}

function step() {
  const visualSq = params.visualRange * params.visualRange;
  const protectedSq = params.protectedRange * params.protectedRange;

  for (let i = 0; i < boids.length; i++) {
    const b = boids[i];

    let closeDx = 0;
    let closeDy = 0;
    let avgVx = 0;
    let avgVy = 0;
    let avgX = 0;
    let avgY = 0;
    let neighbors = 0;

    for (let j = 0; j < boids.length; j++) {
      if (i === j) continue;
      const o = boids[j];
      const dx = b.x - o.x;
      const dy = b.y - o.y;
      const distSq = dx * dx + dy * dy;
      if (distSq >= visualSq) continue;

      if (distSq < protectedSq) {
        closeDx += dx;
        closeDy += dy;
      } else {
        avgVx += o.vx;
        avgVy += o.vy;
        avgX += o.x;
        avgY += o.y;
        neighbors++;
      }
    }

    if (neighbors > 0) {
      avgVx /= neighbors;
      avgVy /= neighbors;
      avgX /= neighbors;
      avgY /= neighbors;
      b.vx += (avgVx - b.vx) * params.alignment;
      b.vy += (avgVy - b.vy) * params.alignment;
      b.vx += (avgX - b.x) * params.cohesion;
      b.vy += (avgY - b.y) * params.cohesion;
    }

    b.vx += closeDx * params.separation;
    b.vy += closeDy * params.separation;

    if (mouse.active) {
      const dx = b.x - mouse.x;
      const dy = b.y - mouse.y;
      const distSq = dx * dx + dy * dy;
      const r = params.mouseRadius;
      if (distSq < r * r && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / r;
        b.vx += (dx / dist) * falloff * params.mouseStrength;
        b.vy += (dy / dist) * falloff * params.mouseStrength;
      }
    }

    const m = params.edgeMargin;
    if (b.x < m) b.vx += params.turnFactor;
    if (b.x > width - m) b.vx -= params.turnFactor;
    if (b.y < m) b.vy += params.turnFactor;
    if (b.y > height - m) b.vy -= params.turnFactor;

    const speed = Math.hypot(b.vx, b.vy) || 0.0001;
    if (speed > params.maxSpeed) {
      b.vx = (b.vx / speed) * params.maxSpeed;
      b.vy = (b.vy / speed) * params.maxSpeed;
    } else if (speed < params.minSpeed) {
      b.vx = (b.vx / speed) * params.minSpeed;
      b.vy = (b.vy / speed) * params.minSpeed;
    }

    b.x += b.vx;
    b.y += b.vy;

    if (b.x < -10) b.x = width + 10;
    else if (b.x > width + 10) b.x = -10;
    if (b.y < -10) b.y = height + 10;
    else if (b.y > height + 10) b.y = -10;
  }
}

function draw() {
  if (trails) {
    ctx.fillStyle = 'rgba(8, 12, 24, 0.18)';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.fillStyle = '#080c18';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.fillStyle = '#cfe6ff';
  for (let i = 0; i < boids.length; i++) {
    const b = boids[i];
    const angle = Math.atan2(b.vy, b.vx);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const len = 9;
    const wing = 4;

    const tipX = b.x + cos * len;
    const tipY = b.y + sin * len;
    const leftX = b.x + (-cos * 0.4 - sin) * wing;
    const leftY = b.y + (-sin * 0.4 + cos) * wing;
    const rightX = b.x + (-cos * 0.4 + sin) * wing;
    const rightY = b.y + (-sin * 0.4 - cos) * wing;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(leftX, leftY);
    ctx.lineTo(rightX, rightY);
    ctx.closePath();
    ctx.fill();
  }
}

function frame() {
  step();
  draw();
  requestAnimationFrame(frame);
}

function bindControl(id: keyof Params) {
  const input = document.getElementById(id) as HTMLInputElement | null;
  if (!input) return;
  const out = document.querySelector<HTMLOutputElement>(`output[data-for="${id}"]`);
  const apply = () => {
    const v = parseFloat(input.value);
    (params as unknown as Record<string, number>)[id] = v;
    if (out) out.textContent = formatValue(id, v);
    if (id === 'count') syncCount(v);
  };
  input.addEventListener('input', apply);
  apply();
}

function formatValue(id: keyof Params, v: number): string {
  if (id === 'cohesion') return v.toFixed(4);
  if (id === 'separation' || id === 'alignment') return v.toFixed(3);
  if (id === 'maxSpeed' || id === 'minSpeed') return v.toFixed(1);
  return String(Math.round(v));
}

function init() {
  resize();
  spawn(params.count);

  bindControl('count');
  bindControl('visualRange');
  bindControl('protectedRange');
  bindControl('separation');
  bindControl('alignment');
  bindControl('cohesion');
  bindControl('maxSpeed');
  bindControl('minSpeed');

  document.getElementById('reset')!.addEventListener('click', () => spawn(params.count));
  const trailsBox = document.getElementById('trails') as HTMLInputElement;
  trailsBox.addEventListener('change', () => {
    trails = trailsBox.checked;
  });

  canvas.addEventListener('pointermove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });
  canvas.addEventListener('pointerleave', () => {
    mouse.active = false;
  });

  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}

init();
