// Boot and the game loop. This file owns the state machine (title, play, pause,
// caught, escaped), input, scoring, the camera and the draw order, and wires the
// turkey, world, farmer, hazards, HUD and audio together.

import {
  VIEW_W, VIEW_H, GROUND_Y, TOTAL_METERS, WORLD_LENGTH, START_X,
  STAGES, createWorld, resetWorld, stageIndexForDistance, distanceForX,
  drawBackdrop, drawForeground, drawHay, drawCorn, drawFinishGate, drawTitleScene,
} from './world.js';
import { Turkey, TURKEY_PHYSICS } from './turkey.js';
import { Farmer } from './farmer.js';
import { Hazards } from './hazards.js';
import { Hud } from './hud.js';
import { AudioBus } from './audio.js';
import { readShotParam, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

class Game {
  constructor() {
    this.world = createWorld();
    this.turkey = new Turkey(this.world);
    this.farmer = new Farmer(this.world);
    this.hazards = new Hazards(this.world);
    this.hud = new Hud(document);
    this.audio = new AudioBus();

    this.keys = new Set();
    this.state = 'title';
    this.mode = 'play';
    this.freeze = false;
    this.clock = 0;
    this.time = 0;
    this.cam = 0;
    this.shake = 0;
    this.flash = 0;
    this.flashColor = '255, 120, 60';
    this.spotted = 0;
    this.stageIndex = 0;
    this.combo = 1;
    this.stats = this.blankStats();
    this.sparkles = [];
    this.dpr = 1;

    this.setupCanvas();
    this.bindInput();
    this.hud.show(false);
    this.hud.setSound(true);

    const shot = readShotParam();
    if (shot) {
      this.state = 'play';
      const staged = applyShot(shot, this);
      this.shotName = shot;
      this.shotFrozen = Boolean(staged && staged.frozen);
    }

    this.last = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  blankStats() {
    return { score: 0, distance: 0, lives: 3, corn: 0, feed: 0, elapsed: 0, bestCombo: 1 };
  }

  setupCanvas() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(VIEW_W * this.dpr);
    canvas.height = Math.round(VIEW_H * this.dpr);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
  }

  bindInput() {
    const start = () => this.startRun();

    window.addEventListener('keydown', (event) => {
      const key = event.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(key)) event.preventDefault();
      if (event.repeat) return;
      this.keys.add(key.toLowerCase());

      if (this.state === 'title') {
        if (key === 'Enter' || key === ' ') { start(); return; }
      }
      if (key === 'p' || key === 'P') { this.togglePause(); return; }
      if (key === 'r' || key === 'R') { this.restart(); return; }
      if (key === 'm' || key === 'M') {
        const on = this.audio.toggle();
        this.hud.setSound(on);
        return;
      }
      if (this.state !== 'play') return;
      if (key === ' ' || key === 'Spacebar') {
        const result = this.turkey.requestJumpOrDash();
        if (result.type === 'jump') this.audio.jump();
        else if (result.type === 'dash') { this.audio.dash(); this.burst(this.turkey.x, GROUND_Y - 20, '#ffe2a0', 7); }
      }
      if (key === 'Shift') {
        const result = this.turkey.requestDash('ground');
        if (result.type === 'dash') { this.audio.dash(); this.burst(this.turkey.x, GROUND_Y - 20, '#ffe2a0', 6); }
      }
      if (key === 'h' || key === 'H') {
        const result = this.turkey.requestHide();
        if (result.type === 'hide') { this.audio.hide(); this.hud.banner('HIDDEN — THE FARMER LOST YOU', 1.5); }
        else if (result.type === 'unhide') this.hud.banner('BACK ON THE RUN', 1.1);
      }
    });

    window.addEventListener('keyup', (event) => this.keys.delete(event.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());

    const stage = document.getElementById('stage');
    stage?.addEventListener('pointerdown', () => {
      this.audio.ensure();
      if (this.state === 'title' || this.state === 'caught' || this.state === 'escaped') start();
    });
    document.getElementById('start-button')?.addEventListener('click', (e) => { e.stopPropagation(); start(); });
    document.getElementById('restart-button')?.addEventListener('click', (e) => { e.stopPropagation(); this.restart(); });
    document.getElementById('resume-button')?.addEventListener('click', (e) => { e.stopPropagation(); this.togglePause(); });
  }

  startRun() {
    this.audio.ensure();
    if (this.state === 'play') return;
    this.resetRun();
    this.showTitle(false);
    this.showEnd(false);
    this.showPause(false);
    this.hud.show(true);
    this.hud.banner('GOBBLE AND RUN!', 1.4);
    this.audio.gobble();
  }

  restart() {
    if (this.state === 'title') return;
    this.resetRun();
    this.showTitle(false);
    this.showEnd(false);
    this.showPause(false);
    this.hud.show(true);
    this.hud.banner('RUN AGAIN — DO NOT GET CAUGHT', 1.5);
    this.audio.gobble();
  }

  resetRun({ quiet = false } = {}) {
    resetWorld(this.world);
    this.turkey.reset();
    this.farmer.reset();
    this.hazards.reset();
    this.stats = this.blankStats();
    this.combo = 1;
    this.stageIndex = 0;
    this.cam = 0;
    this.shake = 0;
    this.flash = 0;
    this.spotted = 0;
    this.sparkles = [];
    this.mode = 'play';
    this.state = 'play';
    this.freeze = false;
    this.hud.reset();
    if (!quiet) this.clock = 0;
  }

  togglePause() {
    if (this.state === 'play') {
      this.state = 'paused';
      this.showPause(true);
    } else if (this.state === 'paused') {
      this.state = 'play';
      this.showPause(false);
      this.last = performance.now();
    }
  }

  showTitle(on) {
    document.getElementById('title-screen')?.classList.toggle('hidden', !on);
  }

  showPause(on) {
    document.getElementById('pause-screen')?.classList.toggle('hidden', !on);
  }

  showEnd(on, kind = 'escaped') {
    const el = document.getElementById('end-screen');
    if (!el) return;
    el.classList.toggle('hidden', !on);
    el.classList.toggle('caught', kind === 'caught');
  }

  fillEndScreen(kind) {
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };
    const s = this.stats;
    const escaped = kind === 'escaped';
    set('end-kicker', escaped ? 'THE GREAT ESCAPE' : 'THANKSGIVING DINNER');
    set('end-title', escaped ? 'ESCAPED!' : 'CAUGHT!');
    set('end-text', escaped
      ? 'You made it to the wild. Gobble free, brave bird.'
      : 'The farmer has you. The oven is already warm.');
    set('end-score', Math.round(s.score).toLocaleString('en-US'));
    set('end-distance', `${Math.round(s.distance)} m`);
    set('end-corn', `${s.corn}`);
    set('end-time', this.formatTime(s.elapsed));
    set('end-note', escaped
      ? `ESCAPE BONUS +1,000 · BEST COMBO x${s.bestCombo.toFixed(1)}`
      : `YOU GOT ${Math.round(s.distance)} m · BEST COMBO x${s.bestCombo.toFixed(1)}`);
  }

  formatTime(seconds) {
    const total = Math.max(0, Math.round(seconds));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  hudState() {
    const dashRatio = 1 - this.turkey.dashCooldown / TURKEY_PHYSICS.DASH_COOLDOWN;
    return {
      score: this.stats.score,
      distance: this.stats.distance,
      totalMeters: TOTAL_METERS,
      stage: STAGES[this.stageIndex],
      stageIndex: this.stageIndex,
      lives: this.stats.lives,
      combo: this.combo,
      dashReady: this.turkey.dashReady,
      dashRatio,
      hideReady: this.turkey.hideReady,
      hidden: this.turkey.hidden,
    };
  }

  burst(x, y, color, count = 6) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 160;
      this.sparkles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed - 60,
        life: 0.5 + Math.random() * 0.3, max: 0.8, color, size: 2 + Math.random() * 3,
      });
    }
  }

  handleEvents(events) {
    for (const event of events) {
      switch (event.type) {
        case 'step':
          this.audio.step(this.turkey.dashTimer > 0);
          break;
        case 'land':
          this.audio.step(true);
          this.burst(event.x, GROUND_Y - 2, '#d8b06a', 4);
          break;
        case 'hit': {
          this.stats.lives = Math.max(0, this.stats.lives - 1);
          this.shake = 14;
          this.flash = 0.6;
          this.flashColor = event.kind === 'oven' ? '255, 120, 40' : '255, 80, 60';
          this.audio.hit();
          this.combo = 1;
          this.burst(event.x, event.y - 40, '#ffb066', 12);
          this.hud.callout(event.kind === 'oven' ? 'TOO HOT!' : event.kind === 'knife' ? 'OUCH!' : 'TRIPPED!');
          if (this.stats.lives <= 0) this.endRun('caught');
          break;
        }
        case 'smash':
          this.audio.smash();
          this.burst(event.x + 20, GROUND_Y - 26, '#d9a65a', 9);
          break;
        case 'caught':
          this.onCaught();
          break;
        case 'farmerSearch':
          this.hud.banner('THE FARMER IS SEARCHING…', 1.4);
          this.audio.alarm();
          break;
        case 'farmerResume':
          this.hud.banner('HE FOUND THE TRAIL!', 1.2);
          this.audio.alarm();
          break;
        case 'ovenFlare':
          this.audio.noise({ dur: 0.22, gain: 0.1, freq: 260 });
          break;
        case 'unhide':
          this.hud.banner('BACK ON THE RUN', 1.1);
          break;
        default:
          break;
      }
    }
  }

  onCaught() {
    this.stats.lives = Math.max(0, this.stats.lives - 1);
    this.shake = 18;
    this.flash = 0.7;
    this.flashColor = '255, 90, 50';
    this.combo = 1;
    this.audio.caught();
    this.hud.callout('CAUGHT!');
    this.burst(this.turkey.x, GROUND_Y - 40, '#ffd08a', 16);
    if (this.stats.lives <= 0) {
      this.endRun('caught');
    } else {
      this.turkey.takeHit();
      this.turkey.invuln = Math.max(this.turkey.invuln, 2.1);
      this.hud.banner(`${this.stats.lives} LIVES LEFT — RUN!`, 1.7);
    }
  }

  endRun(kind) {
    if (this.state !== 'play') return;
    this.state = kind;
    this.mode = kind === 'escaped' ? 'escape' : 'play';
    if (kind === 'escaped') {
      this.stats.score += 1000;
      this.audio.fanfare();
    }
    this.freeze = true;
    this.clock = 0;
    this.hud.show(false);
    this.showEnd(true, kind);
    this.fillEndScreen(kind);
  }

  update(dt) {
    if (this.state !== 'play' || this.freeze) {
      this.hud.tick(dt);
      return;
    }

    const input = {
      forward: this.keys.has('arrowright') || this.keys.has('d'),
      back: this.keys.has('arrowleft') || this.keys.has('a'),
    };
    const events = [];
    this.turkey.update(dt, input, this.stageIndex, events);
    this.farmer.update(dt, this.turkey, this.stageIndex, events);
    this.hazards.update(dt, this.turkey, this.stageIndex, events);
    this.handleEvents(events);

    const distance = distanceForX(this.turkey.x);
    this.stats.distance = distance;
    this.stats.elapsed += dt;

    const nextStage = stageIndexForDistance(distance);
    if (nextStage !== this.stageIndex) {
      this.stageIndex = nextStage;
      this.audio.stageUp();
      this.hud.banner(`STAGE ${nextStage + 1} · ${STAGES[nextStage].name} — ${STAGES[nextStage].subtitle}`, 2.4);
      this.hud.callout(STAGES[nextStage].name);
    }

    const gap = this.turkey.x - this.farmer.x;
    if (!this.turkey.hidden && gap > 250) {
      this.combo = Math.min(3, this.combo + dt * 0.17);
    } else if (gap < 130) {
      this.combo = Math.max(1, this.combo - dt * 0.5);
    }
    this.stats.bestCombo = Math.max(this.stats.bestCombo, this.combo);
    this.stats.score += dt * (70 + this.stageIndex * 16) * this.combo;

    this.spotted = Math.max(0, Math.min(1, (420 - gap) / 300));

    for (const c of this.world.corn) {
      if (c.taken) continue;
      if (Math.abs(c.x - this.turkey.x) < 34 && Math.abs(c.y - (this.turkey.y - 50)) < 62) {
        c.taken = true;
        if (c.kind === 'feed') {
          this.stats.feed += 1;
          this.stats.score += 150;
          this.audio.pickup(true);
          this.hud.callout('FEED +150');
        } else {
          this.stats.corn += 1;
          this.stats.score += 50;
          this.audio.pickup(false);
        }
        this.burst(c.x, c.y, '#ffd766', 6);
      }
    }

    for (const s of this.sparkles) {
      s.life -= dt;
      s.vy += 520 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
    }
    this.sparkles = this.sparkles.filter((s) => s.life > 0);

    this.shake = Math.max(0, this.shake - dt * 46);
    this.flash = Math.max(0, this.flash - dt * 2.4);

    const target = Math.max(0, Math.min(WORLD_LENGTH - VIEW_W, this.turkey.x - 360));
    this.cam += (target - this.cam) * Math.min(1, dt * 7);

    if (distance >= TOTAL_METERS) {
      this.stats.distance = TOTAL_METERS;
      this.endRun('escaped');
    }

    this.hud.update(this.hudState());
    this.hud.tick(dt);
  }

  draw() {
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    const sx = (Math.random() - 0.5) * this.shake;
    const sy = (Math.random() - 0.5) * this.shake;
    ctx.save();
    ctx.translate(sx, sy);

    if (this.state === 'title') this.drawTitle();
    else if (this.mode === 'escape') this.drawEscape();
    else this.drawPlay();

    ctx.restore();

    if (this.spotted > 0.02 && this.state === 'play') {
      const grad = ctx.createRadialGradient(VIEW_W * 0.52, VIEW_H * 0.6, 180, VIEW_W * 0.52, VIEW_H * 0.6, 760);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, `rgba(120, 24, 6, ${0.32 * this.spotted})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(${this.flashColor}, ${this.flash * 0.34})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  drawTitle() {
    drawTitleScene(ctx, this.world, this.time);
    this.turkey.draw(ctx, 0, this.time, {});
    this.farmer.draw(ctx, 0, this.time);
    this.drawSparkles();
  }

  drawPlay() {
    drawBackdrop(ctx, this.world, this.cam, this.stageIndex, this.time);
    drawHay(ctx, this.world, this.cam, this.time, this.turkey.hiddenHay, false);
    drawCorn(ctx, this.world, this.cam, this.time);
    drawFinishGate(ctx, this.cam);
    this.hazards.draw(ctx, this.cam, this.time, this.stageIndex);
    this.farmer.draw(ctx, this.cam, this.time);
    this.turkey.draw(ctx, this.cam, this.time, { hidden: this.turkey.hidden, hay: this.turkey.hiddenHay });
    drawHay(ctx, this.world, this.cam, this.time, this.turkey.hiddenHay, true);
    drawForeground(ctx, this.world, this.cam, this.stageIndex, this.time);
    this.drawSparkles();
  }

  drawEscape() {
    drawBackdrop(ctx, this.world, 0, 0, this.time, 'escape');
    this.turkey.x = 640;
    this.turkey.y = GROUND_Y;
    this.turkey.draw(ctx, 0, this.time, {});
    this.farmer.draw(ctx, 0, this.time);
    this.drawSparkles();
  }

  drawSparkles() {
    for (const s of this.sparkles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, s.life / s.max);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  frame(now) {
    const raw = (now - this.last) / 1000;
    this.last = now;
    const dt = Math.min(1 / 30, Math.max(0, raw || 1 / 60));

    if (this.shotFrozen) {
      this.time = this.clock;
    } else {
      this.time += dt;
      this.update(dt);
    }

    this.draw();
    requestAnimationFrame((t) => this.frame(t));
  }
}

function boot() {
  const game = new Game();
  window.__turkeyTrot = game;
  document.documentElement.dataset.ready = 'true';
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
