// ---------- Sound, synthesised ----------
//
// Oscillators and one noise buffer built at runtime — no audio files, so the
// folder stays a plain text checkout and the game runs offline. Nothing exists
// until unlock() is called from a real gesture, because browsers will not start
// an AudioContext before one.
//
// The important sound here is the footstep of a giant: it is pitched and
// panned by distance, so you can tell how close it is behind you without ever
// turning the camera round.

export class Audio {
  constructor(){
    this.ctx = null;
    this.enabled = true;
    this.ready = false;
    this.step = 0;
  }

  unlock(){
    if (this.ctx){ if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;

    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.7 : 0;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    this.ready = true;
  }

  setEnabled(on){
    this.enabled = on;
    if (this.master) this.master.gain.value = on ? 0.7 : 0;
  }

  _tone(freq, dur, { type = 'sine', gain = 0.2, sweep = 0, delay = 0 } = {}){
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (sweep) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + sweep), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  _noiseHit(dur, { freq = 900, q = 1, gain = 0.2, type = 'bandpass' } = {}){
    if (!this.ready || !this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  // ------------------------------------------------------------------ events
  ui(){ this._tone(560, 0.06, { type: 'square', gain: 0.06 }); }
  deny(){ this._tone(170, 0.13, { type: 'square', gain: 0.09 }); }

  /** Lifting an egg off a nest: a small bright chime, then trouble. */
  grab(){
    this._tone(880, 0.09, { type: 'triangle', gain: 0.17 });
    this._tone(1320, 0.1, { type: 'sine', gain: 0.1, delay: 0.06 });
  }

  /** A giant opening its eyes. */
  roar(){
    this._tone(110, 0.55, { type: 'sawtooth', gain: 0.2, sweep: -45 });
    this._tone(78, 0.6, { type: 'square', gain: 0.14, sweep: -22 });
    this._noiseHit(0.45, { freq: 320, q: 0.6, gain: 0.2, type: 'lowpass' });
  }

  /** One giant footstep. `d` is how far away it is, in world units. */
  stomp(d = 10){
    const near = Math.max(0, 1 - d / 30);
    if (near <= 0.02) return;
    this.step++;
    this._noiseHit(0.16, { freq: 150 + near * 110, q: 0.8, gain: 0.07 + near * 0.26, type: 'lowpass' });
    this._tone(54 + (this.step % 2) * 7, 0.16, { type: 'square', gain: 0.04 + near * 0.12, sweep: -14 });
  }

  caught(){
    this._tone(300, 0.3, { type: 'sawtooth', gain: 0.17, sweep: -190 });
    this._noiseHit(0.4, { freq: 420, q: 0.5, gain: 0.24, type: 'lowpass' });
  }

  safe(){
    [0, 5, 9].forEach((s, i) => this._tone(440 * Math.pow(2, s / 12), 0.17, {
      type: 'triangle', gain: 0.15, delay: i * 0.06,
    }));
  }

  right(){
    [0, 4, 7, 12].forEach((s, i) => this._tone(523.25 * Math.pow(2, s / 12), 0.16, {
      type: 'triangle', gain: 0.19, delay: i * 0.05,
    }));
  }

  wrong(){
    this._tone(220, 0.28, { type: 'sawtooth', gain: 0.13, sweep: -110 });
  }

  /** The shell cracking, then the animal. */
  hatch(){
    this._noiseHit(0.1, { freq: 2400, q: 2, gain: 0.18 });
    this._noiseHit(0.14, { freq: 1600, q: 1.5, gain: 0.16 });
    [0, 7, 12, 16, 19].forEach((s, i) => this._tone(392 * Math.pow(2, s / 12), 0.22, {
      type: 'triangle', gain: 0.16, delay: 0.1 + i * 0.07,
    }));
  }

  /** A species you have never had before. */
  fanfare(){
    [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this._tone(523.25 * Math.pow(2, s / 12), 0.3, {
      type: 'triangle', gain: 0.17, delay: i * 0.075,
    }));
  }

  coin(){
    this._tone(1046, 0.07, { type: 'triangle', gain: 0.1 });
    this._tone(1568, 0.07, { type: 'sine', gain: 0.06, delay: 0.035 });
  }
}
