// The world owns the three stages, their deterministic layout, scenery, ground,
// hay bales and corn/feed pickups. Nothing here touches the player or the HUD.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const GROUND_Y = 650;
export const PX_PER_METER = 18;
export const TOTAL_METERS = 900;
export const START_X = 120;
export const WORLD_LENGTH = START_X + TOTAL_METERS * PX_PER_METER;

export const STAGES = [
  { id: 'farmyard', name: 'FARMYARD', from: 0, to: 280, subtitle: 'THE GREAT GRAIN RUN' },
  { id: 'barn', name: 'THE BARN', from: 280, to: 600, subtitle: 'STRAW AND SHADOWS' },
  { id: 'kitchen', name: 'THE KITCHEN', from: 600, to: 900, subtitle: 'MIND THE OVEN' },
];

export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function stageIndexForDistance(distance) {
  if (distance >= STAGES[2].from) return 2;
  if (distance >= STAGES[1].from) return 1;
  return 0;
}

export function stageForDistance(distance) {
  return STAGES[stageIndexForDistance(distance)];
}

export function distanceForX(x) {
  return Math.max(0, (x - START_X) / PX_PER_METER);
}

export function xForDistance(distance) {
  return START_X + distance * PX_PER_METER;
}

function range(rng, min, max) {
  return min + (max - min) * rng();
}

function pick(rng, items) {
  return items[Math.floor(rng() * items.length) % items.length];
}

function pushHazard(list, type, x, extra = {}) {
  list.push({ type, x, w: 58, h: 40, ...extra });
}

function generateFarm(world, rng) {
  const hazards = [];
  let x = 760;
  let index = 0;
  while (x < STAGES[0].to * PX_PER_METER - 240) {
    const type = index % 5 === 0 ? 'fence' : pick(rng, ['rake', 'trap', 'crate', 'fence']);
    pushHazard(hazards, type, x, {
      w: type === 'fence' ? 94 : type === 'crate' ? 62 : 50,
      h: type === 'fence' ? 42 : type === 'crate' ? 50 : 26,
    });
    x += range(rng, 390, 620);
    index += 1;
  }
  world.hazards.push(...hazards);

  for (let hx = 980; hx < STAGES[0].to * PX_PER_METER; hx += range(rng, 880, 1250)) {
    world.hay.push({ x: hx, w: 92, h: 58, tint: range(rng, 0, 1) });
  }

  for (let i = 0; i < 7; i += 1) {
    const treeX = 250 + i * range(rng, 620, 920);
    world.props.farmTrees.push({ x: treeX, s: range(rng, 0.75, 1.35), hue: rng() });
  }
  world.props.farmBarn = { x: 610, w: 460, h: 270 };
  world.props.silo = { x: 1110, w: 90, h: 330 };
  world.props.windmill = { x: 3060, s: 1.05 };
  for (let i = 0; i < 12; i += 1) {
    world.props.fences.push({ x: 240 + i * 455 + range(rng, -30, 30), s: range(rng, 0.8, 1.1) });
  }
  for (let i = 0; i < 13; i += 1) {
    world.props.pumpkins.push({ x: range(rng, 400, STAGES[0].to * PX_PER_METER - 100), s: range(rng, 0.55, 1.2), hue: rng() });
  }
  for (let i = 0; i < 24; i += 1) {
    world.props.stalks.push({ x: range(rng, 300, STAGES[0].to * PX_PER_METER - 100), s: range(rng, 0.55, 1.25) });
  }
}

function generateBarn(world, rng) {
  const from = STAGES[1].from * PX_PER_METER;
  const to = STAGES[1].to * PX_PER_METER;
  let x = from + 160;
  let index = 0;
  while (x < to - 190) {
    const type = index % 6 === 3 ? 'fallingBale' : pick(rng, ['crate', 'rake', 'fence', 'fallingBale']);
    pushHazard(world.hazards, type, x, {
      w: type === 'fence' ? 90 : type === 'fallingBale' ? 64 : 58,
      h: type === 'fallingBale' ? 60 : 42,
    });
    x += range(rng, 330, 500);
    index += 1;
  }
  for (let hx = from + 300; hx < to - 80; hx += range(rng, 720, 1050)) {
    world.hay.push({ x: hx, w: 94, h: 60, tint: range(rng, 0, 1) });
  }
  for (let i = 0; i < 11; i += 1) {
    world.props.lanterns.push({ x: from + 150 + i * 520, y: 150 + range(rng, -24, 28), s: range(rng, 0.8, 1.15) });
  }
  for (let i = 0; i < 9; i += 1) {
    world.props.barnBeams.push({ x: from + 220 + i * 610, s: range(rng, 0.9, 1.15) });
  }
  for (let i = 0; i < 10; i += 1) {
    world.props.stalls.push({ x: from + 380 + i * 570, s: range(rng, 0.8, 1.1) });
  }
  for (let i = 0; i < 8; i += 1) {
    world.props.hayPiles.push({ x: from + 200 + i * 690, s: range(rng, 0.7, 1.3) });
  }
}

function generateKitchen(world, rng) {
  const from = STAGES[2].from * PX_PER_METER;
  const to = STAGES[2].to * PX_PER_METER;
  const fixed = [
    { type: 'oven', x: from + 760, w: 104, h: 88 },
    { type: 'knifeEmitter', x: from + 1200, w: 36, h: 40 },
    { type: 'oven', x: from + 1620, w: 104, h: 88 },
    { type: 'knifeEmitter', x: from + 2060, w: 36, h: 40 },
    { type: 'oven', x: from + 2540, w: 104, h: 88 },
    { type: 'knifeEmitter', x: from + 3040, w: 36, h: 40 },
    { type: 'oven', x: from + 3580, w: 104, h: 88 },
    { type: 'knifeEmitter', x: from + 4120, w: 36, h: 40 },
    { type: 'oven', x: from + 4660, w: 104, h: 88 },
  ];
  world.hazards.push(...fixed);
  let x = from + 420;
  while (x < to - 240) {
    const type = pick(rng, ['trap', 'crate', 'rake', 'trap']);
    pushHazard(world.hazards, type, x, { w: 52, h: 28 });
    x += range(rng, 280, 440);
  }
  for (let hx = from + 520; hx < to - 140; hx += range(rng, 930, 1220)) {
    world.hay.push({ x: hx, w: 88, h: 56, tint: range(rng, 0, 1), kitchen: true });
  }
  for (let i = 0; i < 9; i += 1) {
    world.props.cabinets.push({ x: from + 220 + i * 610, s: range(rng, 0.88, 1.15) });
  }
  for (let i = 0; i < 8; i += 1) {
    world.props.pots.push({ x: from + 360 + i * 680, s: range(rng, 0.8, 1.2), hue: rng() });
  }
  world.props.kitchenWindow = { x: from + 1580, y: 170 };
  world.props.kitchenClock = { x: from + 2620, y: 150 };
  world.props.backgroundStove = { x: from + 500, y: 360 };
}

function generatePickups(world, rng) {
  const corn = [];
  let clusterX = 390;
  let index = 0;
  while (clusterX < WORLD_LENGTH - 220) {
    const count = 3 + Math.floor(rng() * 3);
    const stage = stageIndexForDistance((clusterX - START_X) / PX_PER_METER);
    const baseY = GROUND_Y - (stage === 2 ? 100 : 92);
    for (let i = 0; i < count; i += 1) {
      corn.push({
        x: clusterX + i * 38,
        y: baseY - Math.sin((i / (count - 1 || 1)) * Math.PI) * (stage === 0 ? 92 : 112),
        kind: index % 13 === 6 ? 'feed' : 'corn',
        taken: false,
        phase: rng() * Math.PI * 2,
      });
    }
    clusterX += range(rng, 315, 510);
    index += 1;
  }
  world.corn.push(...corn);
}

export function createWorld(seed = 0x7a4b21c9) {
  const rng = mulberry32(seed);
  const world = {
    seed,
    stages: STAGES,
    hay: [],
    corn: [],
    hazards: [],
    props: {
      farmTrees: [],
      fences: [],
      pumpkins: [],
      stalks: [],
      lanterns: [],
      barnBeams: [],
      stalls: [],
      hayPiles: [],
      cabinets: [],
      pots: [],
    },
  };
  generateFarm(world, rng);
  generateBarn(world, rng);
  generateKitchen(world, rng);
  generatePickups(world, rng);
  world.hay.sort((a, b) => a.x - b.x);
  world.hazards.sort((a, b) => a.x - b.x);
  world.corn.sort((a, b) => a.x - b.x);
  return world;
}

export function resetWorld(world) {
  for (const c of world.corn) c.taken = false;
  for (const h of world.hay) h.used = false;
}

export function nearestHay(world, x, radius = 86) {
  let best = null;
  let bestDist = radius;
  for (const hay of world.hay) {
    const center = hay.x + hay.w * 0.5;
    const dist = Math.abs(center - x);
    if (dist < bestDist) {
      best = hay;
      bestDist = dist;
    }
  }
  return best;
}

function sx(x, cam, parallax = 1) {
  return Math.round(x - cam * parallax);
}

function skyGradient(ctx, top, mid, bottom) {
  const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.56, mid);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawSun(ctx, x, y, r, warm = 1) {
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 3.8);
  glow.addColorStop(0, `rgba(255, 240, 178, ${0.8 * warm})`);
  glow.addColorStop(0.3, `rgba(255, 190, 94, ${0.22 * warm})`);
  glow.addColorStop(1, 'rgba(255, 160, 60, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  ctx.fillStyle = '#ffe8a0';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(ctx, x, y, s, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fff2d5';
  ctx.beginPath();
  ctx.ellipse(x, y, 70 * s, 22 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 42 * s, y + 5 * s, 36 * s, 16 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 40 * s, y + 7 * s, 42 * s, 15 * s, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 6 * s, y - 15 * s, 34 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHills(ctx, cam, time) {
  const layers = [
    { y: 500, amp: 44, col: '#b86c39', speed: 0.08, offset: 0 },
    { y: 548, amp: 28, col: '#99512c', speed: 0.15, offset: 140 },
    { y: 592, amp: 20, col: '#78401f', speed: 0.24, offset: 320 },
  ];
  for (const layer of layers) {
    ctx.fillStyle = layer.col;
    ctx.beginPath();
    ctx.moveTo(0, VIEW_H);
    for (let x = -40; x <= VIEW_W + 40; x += 26) {
      const wx = x + cam * layer.speed + layer.offset;
      const y = layer.y - Math.sin(wx * 0.0042) * layer.amp - Math.sin(wx * 0.011 + 1.2) * 8;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.closePath();
    ctx.fill();
  }
}

function drawTree(ctx, x, y, s, hue, dark = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = dark ? '#3c2517' : '#59301a';
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(-4, -74);
  ctx.lineTo(5, -78);
  ctx.lineTo(9, 0);
  ctx.closePath();
  ctx.fill();
  const palette = hue > 0.55 ? ['#c96a2d', '#e5933f', '#f1b84e'] : ['#a94f28', '#d07632', '#e9a744'];
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = palette[i % palette.length];
    ctx.beginPath();
    ctx.ellipse(-34 + i * 17, -94 - (i % 2) * 24, 33, 24, (i - 2) * 0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBarn(ctx, x, groundY, w, h) {
  ctx.save();
  ctx.translate(x, groundY - h);
  ctx.fillStyle = '#8f3d24';
  ctx.fillRect(0, 34, w, h - 34);
  ctx.fillStyle = '#6d2b19';
  ctx.beginPath();
  ctx.moveTo(-26, 52);
  ctx.lineTo(w * 0.5, 0);
  ctx.lineTo(w + 26, 52);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b65a30';
  ctx.fillRect(18, 64, w - 36, 8);
  ctx.fillStyle = '#522416';
  ctx.fillRect(w * 0.39, 92, w * 0.22, h - 92);
  ctx.strokeStyle = '#f0c77a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w * 0.39, 92);
  ctx.lineTo(w * 0.61, h);
  ctx.moveTo(w * 0.61, 92);
  ctx.lineTo(w * 0.39, h);
  ctx.stroke();
  ctx.fillStyle = '#f4dca1';
  ctx.beginPath();
  ctx.arc(w * 0.5, 60, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#73301d';
  ctx.beginPath();
  ctx.arc(w * 0.5, 60, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 219, 151, 0.24)';
  ctx.lineWidth = 1;
  for (let y = 68; y < h; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSilo(ctx, x, groundY, w, h) {
  ctx.save();
  ctx.translate(x, groundY - h);
  ctx.fillStyle = '#b5a083';
  ctx.fillRect(0, 36, w, h - 36);
  ctx.fillStyle = '#7b6652';
  ctx.beginPath();
  ctx.arc(w / 2, 38, w / 2, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = 'rgba(86, 60, 39, 0.25)';
  for (let y = 55; y < h; y += 12) ctx.fillRect(0, y, w, 2);
  ctx.fillStyle = '#614a36';
  ctx.fillRect(w * 0.5 - 2, 50, 4, h - 50);
  ctx.restore();
}

function drawFence(ctx, x, groundY, s) {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(s, s);
  ctx.strokeStyle = '#6b3c21';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * 46, 0);
    ctx.lineTo(i * 46, -58);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-8, -19);
  ctx.lineTo(146, -24);
  ctx.moveTo(-8, -45);
  ctx.lineTo(146, -50);
  ctx.stroke();
  ctx.restore();
}

function drawPumpkin(ctx, x, groundY, s, hue) {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(s, s);
  const color = hue > 0.6 ? '#d97a26' : '#c46120';
  ctx.fillStyle = color;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i * 9, -18, 12, 19, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#5d3a1c';
  ctx.fillRect(-2, -40, 4, 10);
  ctx.strokeStyle = '#7e4c19';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(2, -36);
  ctx.quadraticCurveTo(18, -46, 21, -34);
  ctx.stroke();
  ctx.restore();
}

function drawStalk(ctx, x, groundY, s) {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.scale(s, s);
  ctx.strokeStyle = '#6f7b3c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-2, -78);
  ctx.stroke();
  ctx.fillStyle = '#8e9745';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.ellipse(i % 2 ? 8 : -8, -18 - i * 16, 15, 5, i % 2 ? -0.5 : 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawFarmBackdrop(ctx, world, cam, time) {
  skyGradient(ctx, '#f7c27b', '#ee9c59', '#bd6233');
  drawSun(ctx, 1060 - cam * 0.02, 112, 48, 1);
  for (let i = 0; i < 5; i += 1) {
    const cx = ((i * 310 + 120 - cam * 0.035 + time * 2) % 1500) - 100;
    drawCloud(ctx, cx, 105 + (i % 3) * 42, 0.72 + (i % 2) * 0.18, 0.3 + (i % 3) * 0.08);
  }
  drawHills(ctx, cam, time);

  const barn = world.props.farmBarn;
  drawBarn(ctx, sx(barn.x, cam, 0.8), GROUND_Y + 18, barn.w, barn.h);
  drawSilo(ctx, sx(world.props.silo.x, cam, 0.8), GROUND_Y + 18, world.props.silo.w, world.props.silo.h);

  for (const tree of world.props.farmTrees) {
    drawTree(ctx, sx(tree.x, cam, 0.72), GROUND_Y + 12, tree.s, tree.hue);
  }
  for (const fence of world.props.fences) {
    drawFence(ctx, sx(fence.x, cam, 0.94), GROUND_Y + 4, fence.s);
  }
  for (const stalk of world.props.stalks) drawStalk(ctx, sx(stalk.x, cam, 0.97), GROUND_Y + 2, stalk.s);
  for (const pumpkin of world.props.pumpkins) drawPumpkin(ctx, sx(pumpkin.x, cam, 0.97), GROUND_Y + 1, pumpkin.s, pumpkin.hue);

  if (world.props.windmill) {
    const wx = sx(world.props.windmill.x, cam, 0.65);
    ctx.save();
    ctx.translate(wx, GROUND_Y - 180);
    ctx.fillStyle = '#6d4227';
    ctx.beginPath();
    ctx.moveTo(-38, 190);
    ctx.lineTo(-15, 0);
    ctx.lineTo(15, 0);
    ctx.lineTo(38, 190);
    ctx.closePath();
    ctx.fill();
    ctx.translate(0, -4);
    ctx.rotate(time * 0.18);
    ctx.strokeStyle = '#4f2d19';
    ctx.lineWidth = 6;
    for (let i = 0; i < 4; i += 1) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -88);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 224, 163, 0.32)';
      ctx.beginPath();
      ctx.moveTo(-3, -70);
      ctx.lineTo(-18, -88);
      ctx.lineTo(3, -88);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawFarmGround(ctx, cam, time) {
  const top = GROUND_Y;
  ctx.fillStyle = '#7f7438';
  ctx.fillRect(0, top, VIEW_W, VIEW_H - top);
  ctx.fillStyle = '#9b8b45';
  ctx.fillRect(0, top, VIEW_W, 16);
  ctx.fillStyle = '#6d4b29';
  ctx.beginPath();
  ctx.moveTo(0, top + 18);
  for (let x = 0; x <= VIEW_W; x += 40) {
    const wx = x + cam;
    ctx.lineTo(x, top + 20 + Math.sin(wx * 0.02) * 5 + Math.sin(wx * 0.006) * 9);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.lineTo(0, VIEW_H);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5d3a1e';
  for (let i = 0; i < 34; i += 1) {
    const wx = i * 97 + 31;
    const x = sx(wx, cam, 1);
    const y = top + 36 + (i * 37) % 90;
    ctx.beginPath();
    ctx.ellipse(x, y, 5 + (i % 4), 2.4, (i % 5) * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#5f7b36';
  ctx.lineWidth = 2;
  for (let i = 0; i < 44; i += 1) {
    const x = sx(i * 83 + 40, cam, 1);
    const sway = Math.sin(time * 2 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(x, top + 6);
    ctx.quadraticCurveTo(x + 4 + sway, top - 7, x + 8 + sway, top - 14 - (i % 3) * 5);
    ctx.stroke();
  }
}

function drawBarnBackdrop(ctx, world, cam, time) {
  skyGradient(ctx, '#2b1b14', '#3e2416', '#24140d');
  ctx.fillStyle = '#4c2c19';
  ctx.fillRect(0, 0, VIEW_W, GROUND_Y);
  ctx.strokeStyle = 'rgba(22, 10, 5, 0.45)';
  ctx.lineWidth = 3;
  for (let x = -((cam * 0.9) % 54); x < VIEW_W; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GROUND_Y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 205, 126, 0.045)';
  for (let i = 0; i < 7; i += 1) {
    const x = ((i * 260 - cam * 0.45 + time * 2) % 1500) - 80;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 74, 0);
    ctx.lineTo(x + 250, GROUND_Y);
    ctx.lineTo(x + 150, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = '#352013';
  ctx.fillRect(0, 74, VIEW_W, 34);
  ctx.fillStyle = '#24140c';
  ctx.fillRect(0, 104, VIEW_W, 8);
  for (const beam of world.props.barnBeams) {
    const x = sx(beam.x, cam, 0.9);
    ctx.save();
    ctx.translate(x, 0);
    ctx.scale(beam.s, beam.s);
    ctx.fillStyle = '#5e371e';
    ctx.fillRect(-12, 0, 24, GROUND_Y);
    ctx.fillStyle = '#76482a';
    ctx.fillRect(-12, 0, 5, GROUND_Y);
    ctx.restore();
  }
  for (const stall of world.props.stalls) {
    const x = sx(stall.x, cam, 0.93);
    ctx.save();
    ctx.translate(x, 230);
    ctx.scale(stall.s, stall.s);
    ctx.fillStyle = '#2a170d';
    ctx.fillRect(0, 0, 150, 330);
    ctx.strokeStyle = '#6c4124';
    ctx.lineWidth = 7;
    ctx.strokeRect(0, 0, 150, 330);
    ctx.strokeStyle = '#8a5831';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 150);
    ctx.lineTo(144, 150);
    ctx.moveTo(6, 240);
    ctx.lineTo(144, 240);
    ctx.stroke();
    ctx.restore();
  }
  for (const pile of world.props.hayPiles) {
    const x = sx(pile.x, cam, 0.96);
    ctx.save();
    ctx.translate(x, GROUND_Y - 10);
    ctx.scale(pile.s, pile.s);
    ctx.fillStyle = '#a7792f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 78, 42, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#c49543';
    ctx.beginPath();
    ctx.ellipse(-18, -10, 42, 27, -0.2, Math.PI, 0);
    ctx.fill();
    ctx.restore();
  }
  for (const lantern of world.props.lanterns) {
    const x = sx(lantern.x, cam, 0.97);
    const y = lantern.y;
    const glow = ctx.createRadialGradient(x, y + 12, 5, x, y + 12, 95);
    glow.addColorStop(0, 'rgba(255, 194, 90, 0.42)');
    glow.addColorStop(1, 'rgba(255, 160, 45, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 100, y - 90, 200, 200);
    ctx.strokeStyle = '#2a170d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, y - 6);
    ctx.stroke();
    ctx.fillStyle = '#352015';
    ctx.fillRect(x - 10, y - 6, 20, 26);
    ctx.fillStyle = '#ffd57f';
    ctx.fillRect(x - 6, y, 12, 15);
  }
}

function drawBarnGround(ctx, cam) {
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  ctx.fillStyle = '#3d2716';
  for (let y = GROUND_Y + 8; y < VIEW_H; y += 28) {
    ctx.fillRect(0, y, VIEW_W, 3);
    for (let x = -((cam + y * 2) % 120); x < VIEW_W; x += 120) ctx.fillRect(x, y - 26, 3, 26);
  }
  ctx.fillStyle = 'rgba(222, 169, 78, 0.12)';
  ctx.fillRect(0, GROUND_Y, VIEW_W, 7);
  for (let i = 0; i < 18; i += 1) {
    const x = sx(i * 137 + 44, cam, 1);
    const y = GROUND_Y + 25 + ((i * 53) % 100);
    ctx.fillStyle = 'rgba(194, 150, 73, 0.5)';
    ctx.fillRect(x, y, 4 + (i % 4), 2);
  }
}

function drawKitchenBackdrop(ctx, world, cam, time) {
  skyGradient(ctx, '#2f2018', '#3d2619', '#1d120c');
  const tileTop = 84;
  ctx.fillStyle = '#e0c99c';
  ctx.fillRect(0, tileTop, VIEW_W, 312);
  ctx.strokeStyle = 'rgba(134, 93, 57, 0.24)';
  ctx.lineWidth = 1;
  const tile = 46;
  const offX = (cam * 0.75) % tile;
  for (let x = -offX; x < VIEW_W; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, tileTop);
    ctx.lineTo(x, 396);
    ctx.stroke();
  }
  for (let y = tileTop; y <= 396; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_W, y);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255, 238, 191, 0.18)';
  for (let x = -offX; x < VIEW_W; x += tile * 2) ctx.fillRect(x + 3, tileTop + 3, 12, 4);

  ctx.fillStyle = '#b99b6b';
  ctx.fillRect(0, 396, VIEW_W, 60);
  ctx.fillStyle = '#8f7047';
  ctx.fillRect(0, 396, VIEW_W, 7);
  ctx.fillStyle = '#6e5031';
  ctx.fillRect(0, 450, VIEW_W, 10);

  const win = world.props.kitchenWindow;
  if (win) {
    const x = sx(win.x, cam, 0.9);
    ctx.save();
    ctx.translate(x, win.y);
    ctx.fillStyle = '#4b3020';
    ctx.fillRect(-6, -6, 206, 174);
    const night = ctx.createLinearGradient(0, 0, 0, 162);
    night.addColorStop(0, '#2b4361');
    night.addColorStop(0.65, '#6e5a65');
    night.addColorStop(1, '#d98b52');
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, 194, 162);
    ctx.fillStyle = 'rgba(255, 235, 185, 0.9)';
    ctx.beginPath();
    ctx.arc(150, 44, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2d3a31';
    ctx.beginPath();
    ctx.moveTo(0, 128);
    ctx.lineTo(40, 100);
    ctx.lineTo(92, 132);
    ctx.lineTo(150, 95);
    ctx.lineTo(194, 120);
    ctx.lineTo(194, 162);
    ctx.lineTo(0, 162);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#4b3020';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(97, 0);
    ctx.lineTo(97, 162);
    ctx.moveTo(0, 81);
    ctx.lineTo(194, 81);
    ctx.stroke();
    ctx.restore();
  }

  for (const cab of world.props.cabinets) {
    const x = sx(cab.x, cam, 0.93);
    ctx.save();
    ctx.translate(x, 200);
    ctx.scale(cab.s, cab.s);
    ctx.fillStyle = '#72492b';
    ctx.fillRect(0, 0, 166, 200);
    ctx.fillStyle = '#875b36';
    ctx.fillRect(8, 8, 72, 184);
    ctx.fillRect(86, 8, 72, 184);
    ctx.strokeStyle = 'rgba(50, 27, 14, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(8, 8, 72, 184);
    ctx.strokeRect(86, 8, 72, 184);
    ctx.fillStyle = '#e1b65e';
    ctx.beginPath();
    ctx.arc(65, 105, 5, 0, Math.PI * 2);
    ctx.arc(101, 105, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const stove = world.props.backgroundStove;
  if (stove) {
    const x = sx(stove.x, cam, 0.95);
    ctx.fillStyle = '#3d2b21';
    ctx.fillRect(x, stove.y, 160, 230);
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(x + 8, stove.y + 10, 144, 42);
    ctx.fillStyle = '#22140d';
    ctx.fillRect(x + 20, stove.y + 82, 120, 78);
    ctx.fillStyle = 'rgba(255, 135, 40, 0.45)';
    ctx.fillRect(x + 28, stove.y + 90, 104, 62);
    ctx.strokeStyle = '#b28a57';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + 80, stove.y + 120, 22, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const pot of world.props.pots) {
    const x = sx(pot.x, cam, 0.98);
    ctx.save();
    ctx.translate(x, 110);
    ctx.scale(pot.s, pot.s);
    ctx.strokeStyle = '#2f1b10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -55);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.fillStyle = pot.hue > 0.5 ? '#6c3b2b' : '#4f3929';
    ctx.beginPath();
    ctx.ellipse(0, 14, 24, 18, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillRect(-24, 0, 48, 12);
    ctx.fillStyle = '#c38d4d';
    ctx.fillRect(-18, -2, 36, 4);
    ctx.restore();
  }

  const clock = world.props.kitchenClock;
  if (clock) {
    const x = sx(clock.x, cam, 0.94);
    ctx.fillStyle = '#4d2e1c';
    ctx.beginPath();
    ctx.arc(x, clock.y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0dca9';
    ctx.beginPath();
    ctx.arc(x, clock.y, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2114';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, clock.y);
    ctx.lineTo(x, clock.y - 17);
    ctx.moveTo(x, clock.y);
    ctx.lineTo(x + 12, clock.y + 7);
    ctx.stroke();
  }

  const glowX = sx(stove ? stove.x + 80 : 600, cam, 0.95);
  const glow = ctx.createRadialGradient(glowX, 510, 30, glowX, 510, 260);
  glow.addColorStop(0, 'rgba(255, 143, 48, 0.36)');
  glow.addColorStop(1, 'rgba(255, 120, 30, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(glowX - 280, 240, 560, 420);
}

function drawKitchenGround(ctx, cam) {
  ctx.fillStyle = '#d5bd8d';
  ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
  const size = 52;
  const off = cam % (size * 2);
  for (let y = GROUND_Y; y < VIEW_H; y += size) {
    for (let x = -off; x < VIEW_W; x += size) {
      const ix = Math.floor((x + cam) / size);
      const iy = Math.floor((y - GROUND_Y) / size);
      ctx.fillStyle = (ix + iy) % 2 === 0 ? '#c9b383' : '#b69e70';
      ctx.fillRect(x, y, size, size);
    }
  }
  ctx.fillStyle = 'rgba(70, 42, 25, 0.45)';
  ctx.fillRect(0, GROUND_Y, VIEW_W, 6);
  ctx.fillStyle = 'rgba(255, 230, 177, 0.14)';
  ctx.fillRect(0, GROUND_Y + 6, VIEW_W, 3);
}

export function drawBackdrop(ctx, world, cam, stageIndex, time, mode = 'play') {
  ctx.save();
  if (mode === 'escape') {
    skyGradient(ctx, '#f9d48f', '#f0a45f', '#b45c36');
    drawSun(ctx, 890, 150, 60, 1.2);
    drawHills(ctx, cam, time);
    ctx.fillStyle = '#8f7b3f';
    ctx.fillRect(0, GROUND_Y, VIEW_W, VIEW_H - GROUND_Y);
    ctx.fillStyle = '#b39a51';
    ctx.fillRect(0, GROUND_Y, VIEW_W, 18);
    for (let i = 0; i < 12; i += 1) {
      drawTree(ctx, 110 + i * 116 - (cam * 0.1) % 116, GROUND_Y + 16, 0.8 + (i % 3) * 0.12, i / 12, true);
    }
    ctx.fillStyle = 'rgba(255, 238, 177, 0.32)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.restore();
    return;
  }
  if (stageIndex === 0) {
    drawFarmBackdrop(ctx, world, cam, time);
    drawFarmGround(ctx, cam, time);
  } else if (stageIndex === 1) {
    drawBarnBackdrop(ctx, world, cam, time);
    drawBarnGround(ctx, cam);
  } else {
    drawKitchenBackdrop(ctx, world, cam, time);
    drawKitchenGround(ctx, cam);
  }
  ctx.restore();
}

export function drawForeground(ctx, world, cam, stageIndex, time) {
  ctx.save();
  if (stageIndex === 0) {
    for (let i = 0; i < 20; i += 1) {
      const x = sx(i * 149 + 26, cam, 1.06);
      const sway = Math.sin(time * 1.8 + i * 0.7) * 4;
      ctx.strokeStyle = i % 3 === 0 ? '#4d642b' : '#5d7432';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, VIEW_H + 6);
      ctx.quadraticCurveTo(x + 8, VIEW_H - 34, x + 15 + sway, VIEW_H - 66 - (i % 4) * 9);
      ctx.stroke();
    }
    for (let i = 0; i < 6; i += 1) {
      const x = sx(i * 310 + 120, cam, 1.03);
      drawPumpkin(ctx, x, VIEW_H + 2, 0.8 + (i % 2) * 0.25, 0.4);
    }
  } else if (stageIndex === 1) {
    ctx.fillStyle = 'rgba(12, 5, 2, 0.24)';
    ctx.fillRect(0, VIEW_H - 34, VIEW_W, 34);
    for (let i = 0; i < 12; i += 1) {
      const x = sx(i * 170 + 70, cam, 1.04);
      ctx.fillStyle = '#8e642b';
      ctx.fillRect(x, VIEW_H - 15, 18, 3);
    }
  } else {
    for (let i = 0; i < 10; i += 1) {
      const x = sx(i * 186 + 50, cam, 1.04);
      ctx.fillStyle = 'rgba(78, 47, 28, 0.16)';
      ctx.fillRect(x, VIEW_H - 28, 36, 3);
    }
  }
  ctx.restore();
}

function drawHayBale(ctx, x, y, w, h, tint, front) {
  ctx.save();
  ctx.translate(x, y);
  const base = tint > 0.5 ? '#d0a143' : '#c19035';
  if (!front) {
    ctx.fillStyle = '#8b6328';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h - 8);
    ctx.strokeStyle = 'rgba(91, 57, 18, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(4, i * (h / 5));
      ctx.lineTo(w - 4, i * (h / 5) + 1);
      ctx.stroke();
    }
    ctx.strokeStyle = '#6f4b20';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.lineTo(6, h - 4);
    ctx.moveTo(w - 6, 4);
    ctx.lineTo(w - 6, h - 4);
    ctx.stroke();
    ctx.fillStyle = '#e0b75a';
    for (let i = 0; i < 8; i += 1) {
      ctx.fillRect(9 + (i * 13) % (w - 18), 7 + (i * 7) % (h - 14), 8, 2);
    }
  } else {
    ctx.fillStyle = base;
    ctx.beginPath();
    ctx.ellipse(w * 0.5, 5, w * 0.52, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 224, 132, 0.6)';
    for (let i = 0; i < 10; i += 1) ctx.fillRect(8 + (i * 11) % (w - 16), -4 + (i % 3) * 5, 9, 2);
  }
  ctx.restore();
}

export function drawHay(ctx, world, cam, time, hiddenBale, front = false) {
  for (const hay of world.hay) {
    const x = sx(hay.x, cam, 1);
    if (x < -140 || x > VIEW_W + 140) continue;
    const y = GROUND_Y - hay.h + 3;
    const isHidden = hiddenBale === hay;
    if (front !== isHidden) continue;
    drawHayBale(ctx, x, y, hay.w, hay.h, hay.tint, front);
    if (front && isHidden) {
      ctx.fillStyle = 'rgba(255, 227, 142, 0.35)';
      ctx.beginPath();
      ctx.ellipse(x + hay.w * 0.5, y + 2, hay.w * 0.55, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawCorn(ctx, world, cam, time) {
  for (const c of world.corn) {
    if (c.taken) continue;
    const x = sx(c.x, cam, 1);
    if (x < -40 || x > VIEW_W + 40) continue;
    const bob = Math.sin(time * 2.6 + c.phase) * 5;
    ctx.save();
    ctx.translate(x, c.y + bob);
    ctx.rotate(Math.sin(time * 1.8 + c.phase) * 0.12);
    if (c.kind === 'feed') {
      ctx.fillStyle = '#6e4524';
      ctx.beginPath();
      ctx.moveTo(-13, -17);
      ctx.lineTo(13, -17);
      ctx.lineTo(16, 18);
      ctx.lineTo(-16, 18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e0b45d';
      ctx.fillRect(-8, -10, 16, 4);
      ctx.fillStyle = '#f2d58b';
      ctx.font = 'bold 9px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.fillText('FEED', 0, 8);
    } else {
      const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 23);
      glow.addColorStop(0, 'rgba(255, 214, 103, 0.4)');
      glow.addColorStop(1, 'rgba(255, 186, 55, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-24, -24, 48, 48);
      ctx.fillStyle = '#f4c33e';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 17, 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe28a';
      for (let i = -2; i <= 2; i += 1) ctx.fillRect(-4 + i * 3, -10 + (i % 2) * 5, 2, 13);
      ctx.fillStyle = '#6b8b35';
      ctx.beginPath();
      ctx.ellipse(-6, 13, 7, 4, -0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export function drawFinishGate(ctx, cam) {
  const x = sx(WORLD_LENGTH, cam, 1);
  if (x < -200 || x > VIEW_W + 200) return;
  ctx.save();
  ctx.translate(x, GROUND_Y);
  const glow = ctx.createRadialGradient(0, -95, 10, 0, -95, 190);
  glow.addColorStop(0, 'rgba(255, 240, 173, 0.65)');
  glow.addColorStop(1, 'rgba(255, 197, 87, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-220, -300, 440, 340);
  ctx.fillStyle = '#f6d895';
  ctx.fillRect(-54, -166, 108, 166);
  ctx.fillStyle = '#e7a54e';
  ctx.fillRect(-40, -148, 80, 148);
  ctx.strokeStyle = '#6e4323';
  ctx.lineWidth = 9;
  ctx.strokeRect(-54, -166, 108, 166);
  ctx.fillStyle = 'rgba(255, 245, 200, 0.5)';
  ctx.beginPath();
  ctx.moveTo(-40, -148);
  ctx.lineTo(40, -148);
  ctx.lineTo(40, -90);
  ctx.lineTo(-40, -30);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5e3b1f';
  ctx.font = 'bold 13px Trebuchet MS';
  ctx.textAlign = 'center';
  ctx.fillText('THE WILD', 0, -180);
  ctx.restore();
}

export function drawTitleScene(ctx, world, time) {
  drawBackdrop(ctx, world, 0, 0, time, 'play');
  drawHay(ctx, world, 0, time, null, false);
  drawCorn(ctx, world, 0, time);
  drawForeground(ctx, world, 0, 0, time);
}
