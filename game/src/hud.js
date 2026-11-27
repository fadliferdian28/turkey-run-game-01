// The HUD is plain DOM layered over the canvas: score, distance, lives, stage
// progress, combo and dash meters, the hide prompt, banners and callouts. This
// module only reads state in and writes text, classes and widths out.

const MAX_LIVES = 3;

export class Hud {
  constructor(root = document) {
    this.el = {
      hud: root.getElementById('hud'),
      score: root.getElementById('hud-score'),
      distance: root.getElementById('hud-distance'),
      lives: root.getElementById('hud-lives'),
      stage: root.getElementById('hud-stage'),
      progressText: root.getElementById('hud-progress-text'),
      progress: root.getElementById('hud-progress'),
      combo: root.getElementById('hud-combo'),
      comboFill: root.getElementById('hud-combo-fill'),
      dash: root.getElementById('hud-dash'),
      dashFill: root.getElementById('hud-dash-fill'),
      hide: root.getElementById('hud-hide'),
      banner: root.getElementById('hud-banner'),
      callout: root.getElementById('hud-callout'),
      sound: root.getElementById('sound-badge'),
    };
    this.bannerTimer = 0;
    this.cache = new Map();
    this.buildLives();
  }

  buildLives() {
    const host = this.el.lives;
    if (!host) return;
    host.textContent = '';
    this.lifeEls = [];
    for (let i = 0; i < MAX_LIVES; i += 1) {
      const dot = document.createElement('span');
      dot.className = 'life';
      host.appendChild(dot);
      this.lifeEls.push(dot);
    }
  }

  show(on = true) {
    this.el.hud?.classList.toggle('hidden', !on);
  }

  reset() {
    this.bannerTimer = 0;
    this.el.banner?.classList.remove('show');
    this.el.banner && (this.el.banner.textContent = '');
    this.el.callout?.classList.remove('pop');
    this.cache.clear();
    for (const dot of this.lifeEls ?? []) dot.classList.remove('lost');
  }

  set(key, value, apply) {
    if (this.cache.get(key) === value) return;
    this.cache.set(key, value);
    apply(value);
  }

  update(state) {
    const { score, distance, totalMeters, stage, stageIndex, lives, combo, dashReady, dashRatio, hideReady, hidden } = state;
    this.set('score', Math.round(score), (v) => {
      if (this.el.score) this.el.score.textContent = v.toLocaleString('en-US');
    });
    this.set('distance', Math.round(distance), (v) => {
      if (this.el.distance) this.el.distance.textContent = `${v} m`;
    });
    this.set('lives', lives, (v) => {
      (this.lifeEls ?? []).forEach((dot, i) => dot.classList.toggle('lost', i >= v));
    });
    this.set('stage', `${stageIndex}:${stage.name}`, () => {
      if (this.el.stage) this.el.stage.textContent = `STAGE ${stageIndex + 1} · ${stage.name}`;
    });
    this.set('progressText', `${Math.round(distance)}/${totalMeters}`, (v) => {
      if (this.el.progressText) this.el.progressText.textContent = `${Math.round(distance)} / ${totalMeters} m`;
    });
    this.set('progress', Math.round((distance / totalMeters) * 1000), (v) => {
      if (this.el.progress) this.el.progress.style.width = `${Math.min(100, v / 10)}%`;
    });
    this.set('combo', Math.round(combo * 10), (v) => {
      if (this.el.combo) this.el.combo.textContent = `x${(v / 10).toFixed(1)}`;
      if (this.el.comboFill) this.el.comboFill.style.width = `${Math.min(100, (v / 10 - 1) * 50)}%`;
    });
    this.set('dash', dashReady ? 'READY' : `${Math.max(0, Math.ceil((1 - dashRatio) * 10)) / 10}s`, () => {
      if (this.el.dash) this.el.dash.textContent = dashReady ? 'READY' : 'WAIT';
      if (this.el.dashFill) this.el.dashFill.style.width = `${Math.round(Math.min(1, dashRatio) * 100)}%`;
    });
    this.set('hide', hidden ? 'active' : hideReady ? 'ready' : 'idle', (v) => {
      if (!this.el.hide) return;
      this.el.hide.classList.toggle('active', v === 'active');
      this.el.hide.classList.toggle('ready', v === 'ready');
      this.el.hide.textContent = v === 'active' ? 'HIDDEN!' : v === 'ready' ? 'H · HIDE' : 'H · NO HAY';
    });
  }

  banner(text, seconds = 1.6) {
    const el = this.el.banner;
    if (!el) return;
    el.textContent = text;
    el.classList.add('show');
    this.bannerTimer = seconds;
  }

  tick(dt) {
    if (this.bannerTimer > 0) {
      this.bannerTimer -= dt;
      if (this.bannerTimer <= 0) this.el.banner?.classList.remove('show');
    }
  }

  callout(text) {
    const el = this.el.callout;
    if (!el) return;
    el.textContent = text;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  setSound(on) {
    if (this.el.sound) this.el.sound.textContent = on ? 'SOUND ON · M' : 'SOUND OFF · M';
  }
}
