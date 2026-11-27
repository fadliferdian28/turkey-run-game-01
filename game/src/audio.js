// Procedural sound: no audio files, only oscillators and noise buffers built in
// the browser. The gobble is a warbling saw, footsteps are short clicks, the
// alarm sting is a rising two-tone, and escaping gets a little fanfare.

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.lastStep = 0;
    this.noiseBuffer = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.34;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoise(this.ctx);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  makeNoise(ctx) {
    const length = Math.floor(ctx.sampleRate * 0.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    return buffer;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.34 : 0;
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  tone({ freq = 440, end = null, type = 'sine', dur = 0.18, gain = 0.3, delay = 0, glide = 0 }) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (end !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t0 + dur);
    if (glide) osc.detune.linearRampToValueAtTime(glide, t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.001, gain), t0 + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env);
    env.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  noise({ dur = 0.12, gain = 0.2, delay = 0, freq = 900 }) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.noiseBuffer) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.9;
    const env = ctx.createGain();
    env.gain.setValueAtTime(gain, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(env);
    env.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  gobble() {
    this.tone({ freq: 210, end: 330, type: 'sawtooth', dur: 0.16, gain: 0.22 });
    this.tone({ freq: 300, end: 180, type: 'square', dur: 0.1, gain: 0.09, delay: 0.09 });
    this.noise({ dur: 0.09, gain: 0.07, freq: 1400 });
  }

  step(hard = false) {
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (now - this.lastStep < 0.09) return;
    this.lastStep = now;
    this.noise({ dur: hard ? 0.08 : 0.05, gain: hard ? 0.1 : 0.05, freq: hard ? 520 : 780 });
  }

  jump() {
    this.tone({ freq: 380, end: 620, type: 'triangle', dur: 0.14, gain: 0.16 });
  }

  dash() {
    this.tone({ freq: 640, end: 240, type: 'sawtooth', dur: 0.18, gain: 0.14 });
    this.noise({ dur: 0.16, gain: 0.14, freq: 1800 });
  }

  pickup(feed = false) {
    if (feed) {
      this.tone({ freq: 520, type: 'triangle', dur: 0.12, gain: 0.18 });
      this.tone({ freq: 780, type: 'triangle', dur: 0.16, gain: 0.15, delay: 0.07 });
    } else {
      this.tone({ freq: 720, type: 'sine', dur: 0.1, gain: 0.16 });
      this.tone({ freq: 960, type: 'sine', dur: 0.1, gain: 0.12, delay: 0.05 });
    }
  }

  hide() {
    this.noise({ dur: 0.3, gain: 0.16, freq: 380 });
    this.tone({ freq: 240, end: 180, type: 'triangle', dur: 0.22, gain: 0.1 });
  }

  alarm() {
    this.tone({ freq: 520, type: 'square', dur: 0.12, gain: 0.15 });
    this.tone({ freq: 700, type: 'square', dur: 0.12, gain: 0.15, delay: 0.14 });
    this.tone({ freq: 520, type: 'square', dur: 0.14, gain: 0.13, delay: 0.28 });
  }

  hit() {
    this.tone({ freq: 180, end: 60, type: 'sawtooth', dur: 0.3, gain: 0.28 });
    this.noise({ dur: 0.22, gain: 0.22, freq: 300 });
  }

  smash() {
    this.noise({ dur: 0.2, gain: 0.2, freq: 620 });
    this.tone({ freq: 140, end: 80, type: 'square', dur: 0.16, gain: 0.12 });
  }

  caught() {
    this.tone({ freq: 300, end: 110, type: 'sawtooth', dur: 0.5, gain: 0.24 });
    this.tone({ freq: 220, end: 90, type: 'square', dur: 0.6, gain: 0.14, delay: 0.16 });
    this.noise({ dur: 0.4, gain: 0.16, freq: 220 });
  }

  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      this.tone({ freq, type: 'triangle', dur: 0.28, gain: 0.18, delay: i * 0.14 });
      this.tone({ freq: freq / 2, type: 'sine', dur: 0.3, gain: 0.1, delay: i * 0.14 });
    });
    this.tone({ freq: 1046.5, end: 1567.98, type: 'triangle', dur: 0.5, gain: 0.16, delay: 0.62 });
  }

  stageUp() {
    this.tone({ freq: 392, type: 'triangle', dur: 0.16, gain: 0.16 });
    this.tone({ freq: 587, type: 'triangle', dur: 0.2, gain: 0.16, delay: 0.12 });
  }
}
