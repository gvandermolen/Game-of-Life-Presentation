// Synthesised sound effects: no audio files, works offline.

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.7;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.apply();
  }

  set({ enabled, volume }) {
    if (enabled != null) this.enabled = enabled;
    if (volume != null) this.volume = volume;
    this.apply();
  }

  apply() {
    if (this.master) this.master.gain.value = this.enabled ? this.volume : 0;
  }

  ready() {
    return this.ctx && this.enabled;
  }

  tone(freq, { at = 0, dur = 0.15, type = 'sine', gain = 0.3, slide = 0 } = {}) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + at;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise({ at = 0, dur = 0.2, gain = 0.3, freq = 1200, q = 0.8, type = 'bandpass' } = {}) {
    if (!this.ready()) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  tick() {
    this.noise({ dur: 0.03, gain: 0.35, freq: 3200, q: 4 });
    this.tone(1800, { dur: 0.02, type: 'square', gain: 0.04 });
  }

  hop() {
    this.noise({ dur: 0.06, gain: 0.25, freq: 700, q: 2 });
    this.tone(220, { dur: 0.06, type: 'triangle', gain: 0.12 });
  }

  whoosh() {
    this.noise({ dur: 0.45, gain: 0.16, freq: 600, q: 0.5, type: 'lowpass' });
  }

  card() {
    this.noise({ dur: 0.12, gain: 0.2, freq: 2400, q: 0.7 });
    this.tone(660, { at: 0.05, dur: 0.18, type: 'triangle', gain: 0.08 });
  }

  good() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, { at: i * 0.08, dur: 0.3, type: 'triangle', gain: 0.18 }));
  }

  bad() {
    this.tone(311, { dur: 0.25, type: 'sawtooth', gain: 0.07 });
    this.tone(233, { at: 0.2, dur: 0.4, type: 'sawtooth', gain: 0.07 });
  }

  penalty() {
    this.tone(392, { dur: 0.18, type: 'square', gain: 0.06, slide: 0.6 });
  }

  bonus() {
    [784, 988, 1175].forEach((f, i) => this.tone(f, { at: i * 0.06, dur: 0.2, type: 'sine', gain: 0.16 }));
  }

  horn() {
    this.tone(415, { dur: 0.35, type: 'sawtooth', gain: 0.06 });
    this.tone(523, { dur: 0.35, type: 'sawtooth', gain: 0.05 });
  }

  crash() {
    this.horn();
    this.noise({ at: 0.35, dur: 0.6, gain: 0.7, freq: 900, q: 0.4 });
    this.noise({ at: 0.35, dur: 0.25, gain: 0.5, freq: 160, q: 0.6, type: 'lowpass' });
    this.tone(90, { at: 0.35, dur: 0.4, type: 'sine', gain: 0.5, slide: 0.5 });
    for (let i = 0; i < 6; i++) this.noise({ at: 0.5 + i * 0.07, dur: 0.05, gain: 0.2, freq: 4000 + i * 300, q: 6 });
  }

  fanfare() {
    const notes = [523, 523, 659, 784, 659, 784, 1046];
    notes.forEach((f, i) => this.tone(f, { at: i * 0.14, dur: i === notes.length - 1 ? 0.9 : 0.16, type: 'triangle', gain: 0.2 }));
    notes.forEach((f, i) => this.tone(f / 2, { at: i * 0.14, dur: 0.16, type: 'sine', gain: 0.1 }));
  }
}
