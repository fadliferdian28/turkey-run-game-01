// The farmer: one job, the chase. He runs the turkey down, loses the trail when
// it hides in hay, searches the last place he saw it, and cuts it off if it
// falls behind. Speed and aggression climb with the stage.

import { GROUND_Y, WORLD_LENGTH } from './world.js';

const CATCH_RANGE = 54;

export class Farmer {
  constructor(world) {
    this.world = world;
    this.reset();
  }

  reset() {
    this.x = 40;
    this.y = GROUND_Y;
    this.state = 'chase';
    this.speed = 180;
    this.phase = 0;
    this.stunTimer = 0;
    this.searchTimer = 0;
    this.searchAnchor = 0;
    this.lastSeen = 0;
    this.alert = 0;
    this.lunge = 0;
    this.gap = 0;
    this.dust = [];
    this.dustTimer = 0;
    this.facing = 1;
  }

  get box() {
    return { x: this.x - 30, y: this.y - 118, w: 60, h: 118 };
  }

  update(dt, turkey, stageIndex, events) {
    const base = 172 + stageIndex * 47;
    this.phase += dt * (5.5 + base / 55);
    this.alert = Math.max(0, this.alert - dt);
    this.lunge = Math.max(0, this.lunge - dt);
    this.dustTimer -= dt;
    for (const p of this.dust) {
      p.life -= dt;
      p.x -= dt * 26;
      p.y -= dt * 10;
    }
    this.dust = this.dust.filter((p) => p.life > 0);

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.x -= dt * 46;
      this.gap = turkey.x - this.x;
      return;
    }

    this.gap = turkey.x - this.x;

    if (turkey.hidden) {
      if (this.state !== 'search') {
        this.state = 'search';
        this.searchTimer = 3.2;
        this.searchAnchor = Math.max(60, turkey.x - 40);
        this.lastSeen = turkey.x;
        events.push({ type: 'farmerSearch' });
      }
    } else if (this.state === 'search') {
      this.searchTimer -= dt;
      if (this.searchTimer <= 0) {
        this.state = 'chase';
        this.alert = 0.9;
        events.push({ type: 'farmerResume' });
      }
    }

    let target;
    if (this.state === 'search') {
      this.speed = base * 0.46;
      target = this.searchAnchor + Math.sin(this.phase * 0.85) * 96;
      if (this.searchTimer <= 0 && turkey.hidden) this.searchTimer = 1.6;
    } else if (this.gap < -10) {
      this.state = 'corner';
      this.speed = base * 1.16;
      target = turkey.x + 44;
      this.alert = Math.max(this.alert, 0.2);
    } else {
      this.state = 'chase';
      target = turkey.x - 58;
      this.speed = base;
      if (this.gap < 300) this.speed += 36;
      if (this.gap < 150) this.lunge = Math.max(this.lunge, 0.3);
      if (this.gap > 640) this.speed += 72;
    }

    const dx = target - this.x;
    const move = Math.min(Math.abs(dx), this.speed * dt);
    if (Math.abs(dx) > 1) {
      this.x += Math.sign(dx) * move;
      this.facing = dx >= 0 ? 1 : -1;
    }

    if (turkey.x - this.x > 980) this.x = turkey.x - 980;
    this.x = Math.max(16, Math.min(WORLD_LENGTH + 30, this.x));

    if (this.speed > base * 0.6 && this.dustTimer <= 0) {
      this.dustTimer = 0.11;
      this.dust.push({ x: this.x - 18, y: GROUND_Y - 4, life: 0.42, s: 3 + (this.phase % 3) });
    }

    if (
      !turkey.hidden &&
      turkey.invuln <= 0 &&
      turkey.y > GROUND_Y - 44 &&
      Math.abs(turkey.x - this.x) < CATCH_RANGE
    ) {
      this.stunTimer = 1.65;
      this.x -= 92;
      this.alert = 1.8;
      events.push({ type: 'caught', x: this.x });
    }
  }

  draw(ctx, cam, time) {
    const x = Math.round(this.x - cam);
    if (x < -180 || x > 1460) return;

    for (const p of this.dust) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / 0.42) * 0.5;
      ctx.fillStyle = '#c9a265';
      ctx.beginPath();
      ctx.arc(p.x - cam, p.y, p.s + (0.42 - p.life) * 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const stunned = this.stunTimer > 0;
    const searching = this.state === 'search';
    const bob = Math.sin(this.phase * 2) * (stunned ? 0 : 3);
    const swing = Math.sin(this.phase * 2) * 15;
    const lean = stunned ? -0.18 : this.lunge > 0 ? 0.16 : 0.05;

    ctx.save();
    ctx.translate(x, GROUND_Y);
    ctx.fillStyle = 'rgba(24, 11, 4, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 34, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(lean);
    ctx.translate(0, bob);

    ctx.strokeStyle = '#3a2417';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -46);
    ctx.lineTo(-16 - swing * 0.4, -20);
    ctx.lineTo(-22 - swing * 0.5, -2);
    ctx.moveTo(11, -46);
    ctx.lineTo(17 + swing * 0.4, -20);
    ctx.lineTo(24 + swing * 0.5, -2);
    ctx.stroke();

    ctx.fillStyle = '#2c1a10';
    ctx.beginPath();
    ctx.ellipse(-26 - swing * 0.5, 0, 13, 7, 0, 0, Math.PI * 2);
    ctx.ellipse(28 + swing * 0.5, 0, 13, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const overall = ctx.createLinearGradient(0, -92, 0, -38);
    overall.addColorStop(0, '#4b6d84');
    overall.addColorStop(1, '#31485a');
    ctx.fillStyle = overall;
    ctx.beginPath();
    ctx.moveTo(-22, -92);
    ctx.lineTo(22, -92);
    ctx.lineTo(26, -44);
    ctx.quadraticCurveTo(0, -34, -26, -44);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#c95f2c';
    ctx.fillRect(-24, -96, 48, 20);
    ctx.strokeStyle = 'rgba(255, 226, 172, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(-24, -94 + i * 5);
      ctx.lineTo(24, -94 + i * 5);
      ctx.stroke();
    }

    ctx.strokeStyle = '#3e5a70';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-16, -90);
    ctx.lineTo(-17, -70);
    ctx.moveTo(16, -90);
    ctx.lineTo(17, -70);
    ctx.stroke();

    ctx.fillStyle = '#d8a447';
    ctx.beginPath();
    ctx.arc(-15, -70, 2.4, 0, Math.PI * 2);
    ctx.arc(17, -70, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e2d2a8';
    ctx.beginPath();
    ctx.moveTo(-26, -78);
    ctx.lineTo(26, -78);
    ctx.lineTo(30, -34);
    ctx.lineTo(-30, -34);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 120, 70, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-8, -78);
    ctx.lineTo(-8, -34);
    ctx.moveTo(8, -78);
    ctx.lineTo(8, -34);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 120, 60, 0.18)';
    ctx.beginPath();
    ctx.ellipse(-6, -56, 7, 5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    const arm = searching ? Math.sin(time * 3) * 0.5 : swing * 0.03;
    ctx.strokeStyle = '#c95f2c';
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(-22, -88);
    ctx.lineTo(-40, -72 + arm * 14);
    ctx.lineTo(-44, -56 + arm * 10);
    ctx.moveTo(22, -88);
    ctx.lineTo(40, -80);
    ctx.lineTo(46, -64);
    ctx.stroke();
    ctx.fillStyle = '#e0b184';
    ctx.beginPath();
    ctx.arc(-45, -55 + arm * 10, 7, 0, Math.PI * 2);
    ctx.arc(47, -63, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#7a4a24';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(46, -64);
    ctx.lineTo(58, -150);
    ctx.stroke();
    ctx.strokeStyle = '#b9c2c6';
    ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(58 + i * 6, -150);
      ctx.lineTo(58 + i * 10, -168);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(48, -150);
    ctx.lineTo(70, -150);
    ctx.stroke();

    ctx.fillStyle = '#e0b184';
    ctx.beginPath();
    ctx.ellipse(0, -108, 17, 19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b9b2a2';
    ctx.beginPath();
    ctx.ellipse(0, -94, 14, 13, 0, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#8c8677';
    ctx.beginPath();
    ctx.ellipse(0, -92, 9, 9, 0, 0, Math.PI);
    ctx.fill();

    ctx.fillStyle = '#2a1a10';
    ctx.beginPath();
    ctx.arc(-6, -112, 2.2, 0, Math.PI * 2);
    ctx.arc(6, -112, 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (stunned) {
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -114);
      ctx.lineTo(-2, -108);
      ctx.moveTo(-2, -114);
      ctx.lineTo(-10, -108);
      ctx.moveTo(2, -114);
      ctx.lineTo(10, -108);
      ctx.moveTo(10, -114);
      ctx.lineTo(2, -108);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#5b3a20';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(-11, -118);
      ctx.lineTo(-3, -115);
      ctx.moveTo(11, -118);
      ctx.lineTo(3, -115);
      ctx.stroke();
    }

    ctx.fillStyle = '#b8552c';
    ctx.beginPath();
    ctx.ellipse(0, -104, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e8c47a';
    ctx.beginPath();
    ctx.ellipse(0, -128, 27, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d9ad5c';
    ctx.beginPath();
    ctx.ellipse(0, -134, 16, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a8763a';
    ctx.fillRect(-16, -134, 32, 5);

    ctx.fillStyle = 'rgba(60, 30, 12, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, -144, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(-48, -58 + arm * 10);
    const glow = ctx.createRadialGradient(0, 0, 3, 0, 0, 60);
    glow.addColorStop(0, 'rgba(255, 206, 112, 0.55)');
    glow.addColorStop(1, 'rgba(255, 160, 50, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-62, -62, 124, 124);
    ctx.fillStyle = '#3b2415';
    ctx.fillRect(-7, -12, 14, 18);
    ctx.fillStyle = '#ffd987';
    ctx.fillRect(-4, -9, 8, 12);
    ctx.restore();

    ctx.restore();
    ctx.restore();

    if (this.alert > 0 || searching) {
      const ay = GROUND_Y - 172 + Math.sin(time * 5) * 4;
      ctx.save();
      ctx.globalAlpha = Math.min(1, this.alert + 0.5);
      ctx.fillStyle = searching ? '#e8cf92' : '#ffd45e';
      ctx.strokeStyle = '#5c2a10';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, ay, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4a210c';
      ctx.font = '900 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(searching ? '?' : '!', x, ay + 8);
      ctx.restore();
    }
  }
}
