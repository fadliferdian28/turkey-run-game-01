// Hazards: everything on the route that wants the turkey dead. Ground traps and
// fences to jump, the kitchen oven breathing fire, and the carving knife flying
// at knee height. This module owns their timers, hit boxes and drawing.

import { GROUND_Y, VIEW_W, mulberry32 } from './world.js';

const HIT_TYPES = new Set(['rake', 'trap', 'crate', 'fence', 'fallingBale', 'oven']);

export class Hazards {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    this.rng = mulberry32((this.world.seed ^ 0x5bd1e995) >>> 0);
    this.knives = [];
    this.timers = new Map();
    this.flames = new Map();
    this.broken = new Set();
    this.ovenPulse = 0;
    this.knifeCount = 0;
    for (const hazard of this.world.hazards) {
      if (hazard.type === 'knifeEmitter') this.timers.set(hazard, 0.9 + this.rng() * 0.7);
      if (hazard.type === 'oven') this.timers.set(hazard, 1.4 + this.rng() * 1.2);
    }
  }

  update(dt, turkey, stageIndex, events) {
    const aggression = 0.72 + stageIndex * 0.2;
    this.ovenPulse += dt;

    for (const hazard of this.world.hazards) {
      if (hazard.type === 'knifeEmitter') {
        let t = this.timers.get(hazard) - dt * aggression;
        if (t <= 0 && Math.abs(hazard.x - turkey.x) < 1150 && hazard.x > turkey.x - 260) {
          t = 1.55 - stageIndex * 0.16 + this.rng() * 0.5;
          this.spawnKnife(hazard, stageIndex);
        }
        this.timers.set(hazard, t);
      } else if (hazard.type === 'oven') {
        let t = this.timers.get(hazard) - dt * aggression;
        if (t <= 0) {
          t = 1.9 - stageIndex * 0.18 + this.rng() * 0.6;
          this.flames.set(hazard, 0.62);
          if (Math.abs(hazard.x - turkey.x) < 620) events.push({ type: 'ovenFlare', x: hazard.x });
        }
        this.timers.set(hazard, t);
      }
    }

    for (const [oven, life] of this.flames) {
      const next = life - dt;
      if (next <= 0) this.flames.delete(oven);
      else this.flames.set(oven, next);
    }

    for (const knife of this.knives) {
      knife.x += knife.vx * dt;
      knife.spin += dt * 13;
      knife.bob = Math.sin(knife.spin * 0.8) * 4;
    }
    this.knives = this.knives.filter((k) => k.x > k.origin - 900 && k.x > -140);

    if (turkey.hidden || turkey.invuln > 0) return;

    for (const hazard of this.world.hazards) {
      if (!HIT_TYPES.has(hazard.type) || this.broken.has(hazard)) continue;
      if (Math.abs(hazard.x - turkey.x) > 220) continue;
      if (this.overlapsGround(hazard, turkey)) {
        this.breakHazard(hazard, events);
        this.hit(turkey, events, hazard.type, hazard.x);
        return;
      }
      const flame = this.flames.get(hazard);
      if (hazard.type === 'oven' && flame && flame > 0.18) {
        const reach = 96 + Math.sin(this.ovenPulse * 9) * 12;
        if (turkey.x > hazard.x - 46 && turkey.x < hazard.x + hazard.w + reach && turkey.y > GROUND_Y - 150) {
          this.hit(turkey, events, 'oven', hazard.x);
          return;
        }
      }
    }

    for (const knife of this.knives) {
      if (knife.dead) continue;
      const box = { x: knife.x - 26, y: knife.y - 14, w: 52, h: 30 };
      if (this.boxesOverlap(box, turkey.box)) {
        knife.dead = true;
        this.hit(turkey, events, 'knife', knife.x);
        return;
      }
    }
    this.knives = this.knives.filter((k) => !k.dead);
  }

  spawnKnife(emitter, stageIndex) {
    this.knifeCount += 1;
    const high = stageIndex > 0 && this.rng() > 0.62;
    this.knives.push({
      x: emitter.x,
      y: high ? GROUND_Y - 148 : GROUND_Y - 52,
      vx: -(430 + stageIndex * 46 + this.rng() * 60),
      origin: emitter.x,
      spin: this.rng() * 6,
      bob: 0,
      high,
      dead: false,
    });
    this.timers.set(emitter, 1.4);
  }

  overlapsGround(hazard, turkey) {
    const box = turkey.box;
    const hx = hazard.x;
    const hw = hazard.w;
    const hh = hazard.h;
    const hy = GROUND_Y - hh;
    if (box.x + box.w < hx + 6 || box.x > hx + hw - 6) return false;
    return box.y + box.h > hy + 8;
  }

  boxesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  breakHazard(hazard, events) {
    if (hazard.type === 'fallingBale' || hazard.type === 'crate' || hazard.type === 'fence') {
      this.broken.add(hazard);
      events.push({ type: 'smash', x: hazard.x, kind: hazard.type });
    }
  }

  hit(turkey, events, kind, x) {
    if (!turkey.takeHit()) return;
    events.push({ type: 'hit', kind, x, y: turkey.y });
  }

  draw(ctx, cam, time, stageIndex) {
    for (const hazard of this.world.hazards) {
      if (this.broken.has(hazard)) continue;
      const x = Math.round(hazard.x - cam);
      if (x < -180 || x > VIEW_W + 180) continue;
      if (hazard.type === 'oven') this.drawOven(ctx, x, hazard, time);
      else if (hazard.type === 'knifeEmitter') this.drawKnifeRack(ctx, x, hazard, time);
      else if (hazard.type === 'fallingBale') this.drawFallingBale(ctx, x, hazard, time);
      else if (hazard.type === 'trap') this.drawTrap(ctx, x, hazard, time);
      else if (hazard.type === 'rake') this.drawRake(ctx, x, hazard);
      else if (hazard.type === 'crate') this.drawCrate(ctx, x, hazard);
      else if (hazard.type === 'fence') this.drawFence(ctx, x, hazard);
    }
    for (const knife of this.knives) this.drawKnife(ctx, knife.x - cam, knife);
  }

  drawOven(ctx, x, hazard, time) {
    const w = hazard.w;
    const h = hazard.h;
    const top = GROUND_Y - h;
    ctx.save();
    ctx.translate(x, top);

    const glow = ctx.createRadialGradient(w * 0.5, h * 0.55, 8, w * 0.5, h * 0.55, 150);
    glow.addColorStop(0, 'rgba(255, 138, 42, 0.5)');
    glow.addColorStop(1, 'rgba(255, 110, 20, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-120, -80, w + 240, h + 160);

    ctx.fillStyle = '#3b2a22';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#5a4234';
    ctx.fillRect(0, 0, w, 13);
    ctx.fillStyle = '#2a1c16';
    ctx.fillRect(7, 18, w - 14, h - 30);
    ctx.strokeStyle = '#8d6b4d';
    ctx.lineWidth = 3;
    ctx.strokeRect(7, 18, w - 14, h - 30);
    ctx.fillStyle = '#c9c3b3';
    ctx.fillRect(14, h - 10, w - 28, 4);
    ctx.fillStyle = '#7d7466';
    ctx.fillRect(16, h - 24, w - 32, 3);
    ctx.fillStyle = '#d0cabd';
    ctx.beginPath();
    ctx.arc(w * 0.5, 9, 4, 0, Math.PI * 2);
    ctx.fill();

    const fire = 0.55 + Math.sin(time * 6 + x) * 0.2;
    const inner = ctx.createLinearGradient(0, 26, 0, h - 14);
    inner.addColorStop(0, 'rgba(255, 196, 78, 0.85)');
    inner.addColorStop(0.55, `rgba(255, ${Math.round(110 + fire * 50)}, 34, 0.72)`);
    inner.addColorStop(1, 'rgba(150, 40, 8, 0.7)');
    ctx.fillStyle = inner;
    ctx.fillRect(11, 22, w - 22, h - 38);
    ctx.fillStyle = 'rgba(255, 240, 190, 0.6)';
    for (let i = 0; i < 4; i += 1) {
      const fx = 20 + i * (w - 40) / 3;
      const fh = 8 + Math.abs(Math.sin(time * 5 + i * 1.7 + x)) * 12;
      ctx.beginPath();
      ctx.moveTo(fx - 5, h - 18);
      ctx.quadraticCurveTo(fx, h - 18 - fh, fx + 5, h - 18);
      ctx.fill();
    }

    const flame = this.flames.get(hazard);
    if (flame) {
      const reach = (96 + Math.sin(time * 9) * 12) * Math.min(1, flame / 0.18);
      const fg = ctx.createLinearGradient(w, h * 0.55, w + reach, h * 0.55);
      fg.addColorStop(0, 'rgba(255, 226, 128, 0.85)');
      fg.addColorStop(0.45, 'rgba(255, 138, 40, 0.62)');
      fg.addColorStop(1, 'rgba(220, 60, 10, 0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(w - 4, h * 0.28);
      ctx.quadraticCurveTo(w + reach * 0.6, h * 0.18, w + reach, h * 0.55);
      ctx.quadraticCurveTo(w + reach * 0.6, h * 0.9, w - 4, h * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 245, 205, 0.7)';
      ctx.beginPath();
      ctx.ellipse(w + reach * 0.34, h * 0.55, reach * 0.22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawKnifeRack(ctx, x, hazard, time) {
    ctx.save();
    ctx.translate(x, GROUND_Y - 150);
    ctx.fillStyle = '#4a3122';
    ctx.fillRect(-4, 0, 8, 150);
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(-22, -12, 44, 14);
    ctx.fillStyle = '#b9c2c6';
    ctx.beginPath();
    ctx.moveTo(-12, 2);
    ctx.lineTo(12, 2);
    ctx.lineTo(4, 40);
    ctx.lineTo(-4, 40);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#8e9699';
    ctx.fillRect(-10, 6, 20, 3);
    ctx.fillStyle = 'rgba(255, 214, 128, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 8, 20 + Math.sin(time * 3) * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawKnife(ctx, x, knife) {
    ctx.save();
    ctx.translate(x, knife.y + knife.bob);
    ctx.rotate(knife.spin);
    const trail = ctx.createLinearGradient(-30, 0, 30, 0);
    trail.addColorStop(0, 'rgba(255, 244, 214, 0)');
    trail.addColorStop(1, 'rgba(255, 244, 214, 0.35)');
    ctx.strokeStyle = trail;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(-56, 0);
    ctx.lineTo(-10, 0);
    ctx.stroke();
    ctx.fillStyle = '#e6e9e4';
    ctx.beginPath();
    ctx.moveTo(-26, -7);
    ctx.lineTo(18, -5);
    ctx.lineTo(30, 0);
    ctx.lineTo(18, 5);
    ctx.lineTo(-26, 7);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#aeb5b4';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.lineTo(22, 0);
    ctx.stroke();
    ctx.fillStyle = '#4b2c18';
    ctx.fillRect(-42, -5, 18, 10);
    ctx.fillStyle = '#c9a05a';
    ctx.fillRect(-36, -4, 4, 8);
    ctx.restore();
  }

  drawFallingBale(ctx, x, hazard, time) {
    const h = hazard.h;
    ctx.save();
    ctx.translate(x, GROUND_Y - h);
    ctx.rotate(Math.sin(time * 1.6 + x) * 0.03);
    ctx.fillStyle = '#a77a30';
    ctx.fillRect(0, 0, hazard.w, h);
    ctx.fillStyle = '#c99b42';
    ctx.fillRect(2, 2, hazard.w - 4, h - 6);
    ctx.strokeStyle = 'rgba(96, 60, 18, 0.6)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(3, i * (h / 5));
      ctx.lineTo(hazard.w - 3, i * (h / 5) + 1);
      ctx.stroke();
    }
    ctx.fillStyle = '#6f4b20';
    ctx.fillRect(6, 3, 4, h - 6);
    ctx.fillRect(hazard.w - 10, 3, 4, h - 6);
    ctx.fillStyle = 'rgba(255, 226, 140, 0.5)';
    ctx.fillRect(10, 4, hazard.w - 20, 3);
    ctx.restore();
  }

  drawTrap(ctx, x, hazard, time) {
    ctx.save();
    ctx.translate(x, GROUND_Y);
    const snap = 0.5 + Math.sin(time * 2.4 + x) * 0.5;
    ctx.fillStyle = 'rgba(20, 10, 4, 0.25)';
    ctx.beginPath();
    ctx.ellipse(24, 3, 34, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7c8286';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(24, -7, 24, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#4d4a44';
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(48, -4);
    ctx.lineTo(42, -14);
    ctx.lineTo(6, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d9d2bf';
    ctx.beginPath();
    ctx.arc(24, -11, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8bcb8';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const a = -0.4 + i * 0.28;
      ctx.beginPath();
      ctx.moveTo(24 + Math.cos(a) * 15, -12 + Math.sin(a) * 8);
      ctx.lineTo(24 + Math.cos(a) * (22 + snap * 3), -12 + Math.sin(a) * (11 + snap * 3));
      ctx.stroke();
    }
    ctx.restore();
  }

  drawRake(ctx, x, hazard) {
    ctx.save();
    ctx.translate(x, GROUND_Y);
    ctx.strokeStyle = '#9b6b32';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.lineTo(34, -44);
    ctx.stroke();
    ctx.fillStyle = '#8a9195';
    ctx.beginPath();
    ctx.moveTo(18, -44);
    ctx.lineTo(52, -40);
    ctx.lineTo(50, -30);
    ctx.lineTo(16, -34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6c7377';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(22 + i * 6, -32);
      ctx.lineTo(22 + i * 6, -22);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawCrate(ctx, x, hazard) {
    const w = hazard.w;
    const h = hazard.h;
    ctx.save();
    ctx.translate(x, GROUND_Y - h);
    ctx.fillStyle = '#8a5c2e';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a9743b';
    ctx.fillRect(3, 3, w - 6, h - 6);
    ctx.strokeStyle = '#6b441f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(3, 3);
    ctx.lineTo(w - 3, h - 3);
    ctx.moveTo(w - 3, 3);
    ctx.lineTo(3, h - 3);
    ctx.stroke();
    ctx.strokeRect(3, 3, w - 6, h - 6);
    ctx.fillStyle = 'rgba(255, 214, 140, 0.28)';
    ctx.fillRect(6, 5, w - 12, 3);
    ctx.restore();
  }

  drawFence(ctx, x, hazard) {
    const w = hazard.w;
    const h = hazard.h;
    ctx.save();
    ctx.translate(x, GROUND_Y);
    ctx.strokeStyle = '#7c5730';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(8 + i * (w - 16) / 2, 0);
      ctx.lineTo(10 + i * (w - 16) / 2, -h - 6);
      ctx.stroke();
    }
    ctx.strokeStyle = '#96703f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(2, -h * 0.42);
    ctx.lineTo(w - 2, -h * 0.36);
    ctx.moveTo(2, -h * 0.8);
    ctx.lineTo(w - 2, -h * 0.76);
    ctx.stroke();
    ctx.fillStyle = '#a9814a';
    ctx.beginPath();
    ctx.moveTo(8, -h - 6);
    ctx.lineTo(11, -h - 13);
    ctx.lineTo(14, -h - 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
