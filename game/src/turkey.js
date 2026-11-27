// The player: an autumn turkey who runs, jumps, dashes, hides in hay and
// recovers from hits. This module owns movement physics and the turkey drawing.

import { GROUND_Y, START_X, WORLD_LENGTH, nearestHay } from './world.js';

const GRAVITY = 2050;
const JUMP_VELOCITY = -720;
const DASH_TIME = 0.18;
const DASH_SPEED = 940;
const DASH_COOLDOWN = 2.35;
const HIDE_TIME = 2.15;
const HIDE_COOLDOWN = 4.2;

export class Turkey {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    this.x = START_X;
    this.y = GROUND_Y;
    this.vy = 0;
    this.grounded = true;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.hideTimer = 0;
    this.hideCooldown = 0;
    this.hidden = false;
    this.hiddenHay = null;
    this.invuln = 0;
    this.hitStun = 0;
    this.runPhase = 0;
    this.stepTimer = 0;
    this.bob = 0;
    this.squash = 0;
    this.dashTrail = [];
  }

  get dashReady() {
    return this.dashCooldown <= 0 && !this.hidden;
  }

  get hideReady() {
    return this.hideCooldown <= 0 && !this.hidden;
  }

  requestJumpOrDash() {
    if (this.hidden) return { type: 'none' };
    if (this.grounded) {
      this.vy = JUMP_VELOCITY;
      this.grounded = false;
      this.squash = 1;
      return { type: 'jump' };
    }
    return this.requestDash('air');
  }

  requestDash(source = 'ground') {
    if (this.dashCooldown > 0 || this.hidden) return { type: 'none' };
    this.dashTimer = DASH_TIME;
    this.dashCooldown = DASH_COOLDOWN;
    this.invuln = Math.max(this.invuln, 0.34);
    this.squash = 1;
    return { type: 'dash', source };
  }

  requestHide() {
    if (this.hidden) return { type: 'unhide' };
    if (this.hideCooldown > 0 || !this.grounded) return { type: 'none' };
    const hay = nearestHay(this.world, this.x, 82);
    if (!hay) return { type: 'none' };
    this.hidden = true;
    this.hiddenHay = hay;
    this.hideTimer = HIDE_TIME;
    this.hideCooldown = HIDE_COOLDOWN;
    this.dashTimer = 0;
    return { type: 'hide', hay };
  }

  update(dt, input, stageIndex, events) {
    this.runPhase += dt * (8.5 + (this.dashTimer > 0 ? 10 : 0));
    this.squash = Math.max(0, this.squash - dt * 5.4);
    this.invuln = Math.max(0, this.invuln - dt);
    this.hitStun = Math.max(0, this.hitStun - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.hideCooldown = Math.max(0, this.hideCooldown - dt);
    this.dashTrail = this.dashTrail.filter((p) => p.life > 0);
    for (const p of this.dashTrail) p.life -= dt;

    if (this.hidden) {
      this.hideTimer -= dt;
      if (this.hideTimer <= 0) {
        this.hidden = false;
        this.hiddenHay = null;
        this.x += 14;
        this.invuln = Math.max(this.invuln, 0.5);
        events.push({ type: 'unhide', x: this.x, y: GROUND_Y });
      }
      return;
    }

    if (this.hitStun > 0) {
      this.x = Math.max(START_X, this.x - 34 * dt);
    } else {
      let speed = 205 + stageIndex * 20;
      if (input.forward) speed += 62;
      if (input.back) speed -= 112;
      if (this.dashTimer > 0) {
        speed = DASH_SPEED;
        this.dashTimer -= dt;
        this.dashTrail.push({ x: this.x, y: this.y, life: 0.22, phase: this.runPhase });
      }
      this.x += speed * dt;
    }

    this.x = Math.min(WORLD_LENGTH - 6, Math.max(START_X - 4, this.x));
    this.stepTimer -= dt;
    if (this.grounded && this.hitStun <= 0 && this.stepTimer <= 0) {
      this.stepTimer = this.dashTimer > 0 ? 0.12 : 0.27;
      events.push({ type: 'step', x: this.x, y: GROUND_Y });
    }

    if (!this.grounded) {
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y >= GROUND_Y) {
        this.y = GROUND_Y;
        this.vy = 0;
        this.grounded = true;
        this.squash = 1;
        events.push({ type: 'land', x: this.x, y: GROUND_Y });
      }
    }
    this.bob = this.grounded ? Math.abs(Math.sin(this.runPhase)) * 3 : 0;
  }

  takeHit() {
    if (this.invuln > 0 || this.hidden) return false;
    this.invuln = 1.35;
    this.hitStun = 0.46;
    this.vy = this.grounded ? -290 : this.vy;
    this.grounded = false;
    this.squash = 1;
    return true;
  }

  get box() {
    return { x: this.x - 25, y: this.y - 82, w: 50, h: 82 };
  }

  draw(ctx, cam, time, options = {}) {
    const scale = options.scale ?? 1;
    const screenX = Math.round(this.x - cam);
    if (screenX < -160 || screenX > 1440) return;
    if (options.hidden) {
      this.drawHidden(ctx, screenX, options.hay);
      return;
    }

    for (const trail of this.dashTrail) {
      const tx = Math.round(trail.x - cam);
      ctx.save();
      ctx.globalAlpha = Math.max(0, trail.life / 0.22) * 0.22;
      this.drawBody(ctx, tx, GROUND_Y, scale, trail.phase, true);
      ctx.restore();
    }

    this.drawBody(ctx, screenX, this.y, scale, this.runPhase, false);
  }

  drawHidden(ctx, x, hay) {
    if (!hay) return;
    const top = GROUND_Y - hay.h + 2;
    ctx.save();
    ctx.translate(x, top);
    ctx.strokeStyle = '#8f4a21';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.quadraticCurveTo(6, -18, 18, -22);
    ctx.stroke();
    ctx.fillStyle = '#a95625';
    ctx.beginPath();
    ctx.arc(22, -28, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d07832';
    ctx.beginPath();
    ctx.ellipse(27, -30, 8, 8, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3b23f';
    ctx.beginPath();
    ctx.moveTo(32, -32);
    ctx.lineTo(43, -28);
    ctx.lineTo(32, -24);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d54c36';
    ctx.beginPath();
    ctx.ellipse(24, -19, 4, 8, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#24110a';
    ctx.beginPath();
    ctx.arc(25, -31, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 243, 194, 0.8)';
    ctx.beginPath();
    ctx.arc(26, -32, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawBody(ctx, x, feetY, scale, phase, ghost) {
    const bob = ghost ? 0 : this.bob;
    const jumpTuck = this.grounded ? 0 : Math.min(1, Math.abs(this.vy) / 650);
    const lean = this.dashTimer > 0 ? -0.22 : this.hitStun > 0 ? 0.18 : 0;
    const legSwing = this.grounded ? Math.sin(phase) * 13 : 4 + jumpTuck * 5;
    ctx.save();
    ctx.translate(x, feetY);
    ctx.scale(scale, scale);
    ctx.rotate(lean);

    if (!ghost) {
      ctx.fillStyle = 'rgba(21, 10, 4, 0.28)';
      ctx.beginPath();
      ctx.ellipse(2, 5, 32, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    const tailColors = ['#b84d24', '#d86a2a', '#e99537', '#f2bd55', '#d66c2b', '#a94520'];
    for (let i = 0; i < 7; i += 1) {
      const a = -2.55 + i * 0.24;
      ctx.save();
      ctx.translate(-16, -64 + bob);
      ctx.rotate(a + Math.sin(phase * 0.2 + i) * 0.018);
      ctx.fillStyle = tailColors[i % tailColors.length];
      ctx.beginPath();
      ctx.ellipse(-22, 0, 37, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i % 2 === 0 ? '#f6ce77' : '#e3a343';
      ctx.beginPath();
      ctx.ellipse(-49, 0, 12, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(94, 37, 14, 0.34)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-22, -7);
      ctx.lineTo(-42, -5);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = '#c58b32';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, -36 + bob);
    ctx.lineTo(-12 - legSwing, -10);
    ctx.lineTo(-18 - legSwing, 1);
    ctx.moveTo(10, -36 + bob);
    ctx.lineTo(14 + legSwing, -9);
    ctx.lineTo(22 + legSwing, 1);
    ctx.stroke();
    ctx.fillStyle = '#b77727';
    ctx.beginPath();
    ctx.ellipse(-22 - legSwing, 2, 9, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(25 + legSwing, 2, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const bodyGrad = ctx.createLinearGradient(-25, -76, 25, -22);
    bodyGrad.addColorStop(0, '#c86b2e');
    bodyGrad.addColorStop(0.52, '#9c4b21');
    bodyGrad.addColorStop(1, '#713517');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, -55 + bob, 31, 37, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(87, 38, 15, 0.45)';
    ctx.lineWidth = 1.4;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.arc(-3 + i * 8, -58 + bob, 22, -1.1, 1.3);
      ctx.stroke();
    }

    ctx.fillStyle = '#b95d28';
    ctx.beginPath();
    ctx.ellipse(-7, -58 + bob, 17, 25, -0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 188, 92, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(-7, -58 + bob, 11 + i * 4, -1.5, 0.4);
      ctx.stroke();
    }

    ctx.strokeStyle = '#b95d28';
    ctx.lineWidth = 15;
    ctx.beginPath();
    ctx.moveTo(12, -73 + bob);
    ctx.quadraticCurveTo(23, -89 + bob, 24, -101 + bob);
    ctx.stroke();

    ctx.fillStyle = '#d94a36';
    ctx.beginPath();
    ctx.ellipse(26, -96 + bob, 10, 13, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e1583d';
    ctx.beginPath();
    ctx.arc(29, -106 + bob, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f07b4e';
    ctx.beginPath();
    ctx.arc(33, -110 + bob, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f3b33b';
    ctx.beginPath();
    ctx.moveTo(39, -108 + bob);
    ctx.lineTo(53, -103 + bob);
    ctx.lineTo(39, -98 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c9472d';
    ctx.beginPath();
    ctx.ellipse(35, -95 + bob, 4, 9, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d14a31';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(35, -116 + bob);
    ctx.quadraticCurveTo(38, -125 + bob, 44, -124 + bob);
    ctx.stroke();

    ctx.fillStyle = '#fff7de';
    ctx.beginPath();
    ctx.arc(35, -109 + bob, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#25120a';
    ctx.beginPath();
    ctx.arc(36, -109 + bob, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fffdf2';
    ctx.beginPath();
    ctx.arc(37, -110 + bob, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#682a15';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(35, -113 + bob, 5, 3.6, 5.6);
    ctx.stroke();

    ctx.fillStyle = '#315e5d';
    ctx.beginPath();
    ctx.moveTo(6, -82 + bob);
    ctx.quadraticCurveTo(18, -78 + bob, 24, -88 + bob);
    ctx.lineTo(20, -94 + bob);
    ctx.quadraticCurveTo(11, -85 + bob, 4, -88 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8b44e';
    ctx.beginPath();
    ctx.moveTo(17, -86 + bob);
    ctx.lineTo(25, -91 + bob);
    ctx.lineTo(18, -80 + bob);
    ctx.closePath();
    ctx.fill();

    if (this.dashTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 230, 159, 0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-35 - i * 13, -76 + i * 17);
        ctx.lineTo(-64 - i * 17, -76 + i * 17);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export const TURKEY_PHYSICS = { GRAVITY, JUMP_VELOCITY, DASH_TIME, DASH_SPEED, DASH_COOLDOWN, HIDE_TIME, HIDE_COOLDOWN };
